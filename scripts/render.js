#!/usr/bin/env node

/* eslint-disable no-console */
require('babel-register')({
    plugins: [
        'babel-plugin-transform-es2015-modules-commonjs',
        'babel-plugin-transform-object-rest-spread',
        'babel-plugin-transform-react-jsx',
    ],
    extensions: ['.jsx'],
    cache     : true,
});

const React          = require('react');
const RenderHTML     = require('react-render-html');
const ReactDOMServer = require('../node_modules/react-dom/server.js');

const renderComponent = (context, path) => {
    const Component = require(path).default; // eslint-disable-line

    global.it    = context;
    const result = ReactDOMServer.renderToStaticMarkup(
        React.createElement(
            Component
        )
    );
    return result;
};

const color                = require('cli-color');
const Spinner              = require('cli-spinner').Spinner;
const program              = require('commander');
const Crypto               = require('crypto');
const fs                   = require('fs');
const Path                 = require('path');
const Url                  = require('url');
const common               = require('./common');
const generate_static_data = require('./generate-static-data');
const Gettext              = require('./gettext');

program
    .version('0.2.0')
    .description('Build .jsx templates into /dist folder')
    .option('-d, --dev', 'Build for your gh-pages')
    .option('-b, --branch [branchname]', 'Build your changes to a sub-folder named: br_branchname')
    .option('-p, --path [save_as]', 'Compile only the template/s that match the regex save_as')
    .option('-v, --verbose', 'Displays the list of paths to be compiled')
    .option('-t, --translations', 'Update messages.pot with new translations')
    .option('-j, --js-translations', 'Update js translation files in src/javascript/_autogenerated/')
    .parse(process.argv);

const is_translation = (program.translations || program.jsTranslations);
if (is_translation && (program.dev || program.path)) {
    program.outputHelp(str => {
        console.error(color.red('  ERROR: -t or -j cannot be used alongside other parameters'));
        console.error(str);
        process.exit(0);
    });
}

/** *********************************************
 * Common functions
 */

const getConfig = () => (
    {
        add_translations: false,
        dist_path       : Path.join(common.root_path, 'dist', (program.branch || '')),
        languages       : program.branch === 'translations' ? ['ACH'] : common.languages,
        root_path       : common.root_path,
        root_url        : `/${program.dev ? 'binary-static/' : ''}${program.branch ? `${program.branch}/` : ''}`,
        sections        : ['app', 'static', 'app_2'],
    }
);

const createDirectories = () => {
    if (is_translation) return;

    const config = getConfig();

    console.log(color.cyan('Target: '), color.yellow(config.dist_path));

    const mkdir = path => fs.existsSync(path) || fs.mkdirSync(path);
    mkdir(Path.join(config.dist_path));

    let language;
    config.languages.forEach(lang => {
        language = lang.toLowerCase();
        mkdir(Path.join(config.dist_path, language));
        mkdir(Path.join(config.dist_path, `${language}/pjax`));
    });
};

const fileHash = (path) => (
    new Promise((res) => {
        const fd   = fs.createReadStream(path);
        const hash = Crypto.createHash('sha1');
        hash.setEncoding('hex');

        fd.on('end', () => {
            hash.end();
            res(hash.read());
        });

        fd.pipe(hash);
    })
);


/** **************************************
 * Factory functions
 */

const createTranslator = lang => {
    const gettext = Gettext.getInstance();
    gettext.setLang(lang.toLowerCase());
    return (text, ...args) => gettext.gettext(text, ...args);
};

const createUrlFinder = default_lang => {
    const default_language = default_lang.toLowerCase();
    const config           = getConfig();
    return (url, lang = default_language) => {
        let new_url = url;
        if (new_url === '' || new_url === '/') {
            new_url = '/home';
        }

        if (/^\/?(images|js|css|scripts|download)/.test(new_url)) {
            return Path.join(config.root_url, new_url);
        }

        const p      = Url.parse(new_url, true);
        let pathname = p.pathname.replace(/^\//, '');
        pathname     = Path.join(pathname); // convert a/b/../c to a/c
        if (common.pages.filter(page => page.save_as === pathname).length) {
            p.pathname = Path.join(config.root_url, `${lang}/${pathname}.html`);
            return Url.format(p);
        }

        throw new TypeError(`Invalid url ${new_url}`);
    };
};

const createContextBuilder = async () => {
    const config = getConfig();

    let static_hash = Math.random().toString(36).substring(2, 10);
    if (program.path) {
        try {
            static_hash = await common.readFile(Path.join(config.dist_path, 'version'));
        } catch (e) { } // eslint-disable-line
    }
    const vendor_hash = await fileHash(Path.join(config.dist_path, 'js/vendor.min.js'));
    if (!is_translation) {
        await common.writeFile(Path.join(config.dist_path, 'version'), static_hash, 'utf8');
    }

    const extra = {
        js_files: [
            `${config.root_url}js/texts/{PLACEHOLDER_FOR_LANG}.js?${static_hash}`,
            `${config.root_url}js/manifest.js?${static_hash}`,
            `${config.root_url}js/vendor.min.js?${vendor_hash}`,
            program.dev ?
                `${config.root_url}js/binary.js?${static_hash}` :
                `${config.root_url}js/binary.min.js?${static_hash}`,
        ],
        css_files: [
            `${config.root_url}css/common.min.css?${static_hash}`,
            ...config.sections.map(section => `${config.root_url}css/${section}.min.css?${static_hash}`),
        ],
        languages  : config.languages,
        broker_name: 'Binary.com',
        static_hash,
    };

    return {
        buildFor: (model) => {
            const translator = createTranslator(model.language);
            return Object.assign({}, extra, model, {
                L: (text, ...args) => {
                    const translated = translator(text, ...args);
                    return RenderHTML(translated);
                },
                url_for              : createUrlFinder(model.language),
                dangreouslyRenderHtml: RenderHTML,
            });
        },
    };
};

/** **********************************************
 * Compile
 */

async function compile(page) {
    const config              = getConfig();
    const languages           = config.languages.filter(lang => !common.isExcluded(page.excludes, lang));
    const context_builder     = await createContextBuilder();
    const CONTENT_PLACEHOLDER = 'CONTENT_PLACEHOLDER'; // used in layout.jsx

    const tasks = languages.map(async lang => {
        const model = {
            website_name   : 'Binary.com',
            title          : page.title,
            layout         : page.layout,
            language       : lang.toUpperCase(),
            root_url       : config.root_url,
            only_ja        : page.only_ja,
            current_path   : page.save_as,
            current_route  : page.current_route,
            affiliate_email: 'affiliates@binary.com',
            japan_docs_url : 'https://japan-docs.binary.com',
            is_pjax_request: false,
        };

        const context     = context_builder.buildFor(model);
        const page_html   = renderComponent(context, `../src/templates/${page.tpl_path}.jsx`);
        const language    = lang.toLowerCase();
        const layout_path = `../src/templates/${page.tpl_path.split('/')[0]}/_layout/layout.jsx`;

        if (page.layout) {
            const layout_normal     = `<!DOCTYPE html>\n${renderComponent(context, layout_path)}`;
            context.is_pjax_request = true;
            const layout_pjax       = renderComponent(context, layout_path);

            if (is_translation) return; // Skip saving files when it's a translation update

            // normal layout
            await common.writeFile(
                Path.join(config.dist_path, `${language}/${page.save_as}.html`),
                layout_normal.replace(CONTENT_PLACEHOLDER, page_html),
                'utf8'
            );

            // pjax layout
            await common.writeFile(
                Path.join(config.dist_path, `${language}/pjax/${page.save_as}.html`),
                layout_pjax.replace(CONTENT_PLACEHOLDER, page_html),
                'utf8'
            );
        } else {
            if (is_translation) return; // Skip saving files when it's a translation update
            await common.writeFile(
                Path.join(config.dist_path, `${language}/${page.save_as}.html`),
                /^\s*<html>/.test(page_html) ? `<!DOCTYPE html>\n${page_html}` : page_html,
                'utf8'
            );
        }
    });
    await Promise.all(tasks);
}

createDirectories();
(async () => {
    try {
        if (program.jsTranslations) {
            Gettext.getInstance();
            generate_static_data.build();
            generate_static_data.generate();
            return;
        }

        const regx           = new RegExp(program.path, 'i');
        const pages_filtered = common.pages.filter(p => regx.test(p.save_as));
        const count          = pages_filtered.length;
        if (!count) {
            console.error(color.red('No page matched your request.'));
            return;
        }

        Gettext.getInstance(); // initialize before starting the compilation

        const start   = Date.now();
        const message = common.messageStart(`${is_translation ? 'Parsing' : 'Compiling'} ${count} page${count > 1 ? 's' : ''}`);
        const spinner = new Spinner(`${message} ${color.cyan('%s')}`);
        spinner.setSpinnerString(18);
        spinner.start();

        if (count <= 10 || program.verbose) {
            console.log(common.messageStart('Output list:', true));
            pages_filtered
                .sort((a, b) => a.save_as > b.save_as)
                .forEach((p) => {
                    console.log(color.green('  - '), p.save_as);
                });
        }

        await Promise.all(
            pages_filtered.map(compile)
        );

        spinner.stop();
        process.stdout.write(`\b\b${common.messageEnd(Date.now() - start)}`);

        if (program.translations) {
            const gettext = Gettext.getInstance();
            generate_static_data.build();
            gettext.update_translations();
        }
    } catch (e) {
        console.error(e);
    }
})();

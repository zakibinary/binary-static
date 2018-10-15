import PropTypes                   from 'prop-types';
import React                       from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import DevTools                    from 'mobx-react-devtools';
import PortfolioDrawer             from './Components/Elements/PortfolioDrawer';
import AppContents                 from './Containers/Layout/app_contents.jsx';
import Footer                      from './Containers/Layout/footer.jsx';
import Header                      from './Containers/Layout/header.jsx';
import ThemeWrapper                from './Containers/Layout/theme_wrapper.jsx';
import Routes                      from './Containers/Routes/routes.jsx';
import getBaseName                 from 'Utils/URL/base_name';
import { MobxProvider }            from 'Stores/connect';

const App = ({ root_store }) => (
    <Router basename={getBaseName()}>
        <MobxProvider store={root_store}>
            <ThemeWrapper>
                <div id='header'>
                    <Header />
                </div>

                <AppContents>
                    <Routes />
                    <DevTools />
                    <PortfolioDrawer />
                </AppContents>

                <footer id='footer'>
                    <Footer />
                </footer>
            </ThemeWrapper>
        </MobxProvider>
    </Router>
);

App.propTypes = {
    root_store: PropTypes.object,
};

export default App;

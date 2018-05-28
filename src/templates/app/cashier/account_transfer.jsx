import React from 'react';
import { FormRow, SubmitButton, Fieldset } from '../../_common/components/forms.jsx';
import SeparatorLine from '../../_common/components/separator_line.jsx';

const Row = ({ id }) => (
    <div className='gr-padding-10 gr-push-2 gr-row'>
        <div className='gr-2 gr-4-m align-end'>
            <span id={`${id}_loginid`} />
        </div>
        <div className='gr-10 gr-8-m'>
            <span id={`${id}_currency`} />&nbsp;<span id={`${id}_balance`} />
        </div>
    </div>
);

const AccountTransfer = () => (
    <React.Fragment>
        <div className='center-text'>
            <span id='acc_transfer_header_icon' className='transfer' />
        </div>

        <h1 id='acc_transfer_header_text' className='center-text'>{it.L('Transfer Between Accounts')}</h1>

        <div className='invisible' id='client_message'>
            <p className='center-text notice-msg'>
                <span className='invisible' id='no_account'>{it.L('Fund transfers between accounts are unavailable.')}&nbsp;</span>
                <span className='invisible' id='not_enough_balance'>
                    {it.L('The minimum required amount for using the account transfer facility is [_1].', '<span id="min_required_amount"></span>')}
                    &nbsp;
                </span>
                <span className='invisible' id='no_balance'>
                    {it.L('Please [_1]deposit[_2] to your account.', `<a href='${it.url_for('cashier/forwardws?action=deposit')}'>`, '</a>')}
                    &nbsp;
                </span>
                <span className='invisible' id='limit_reached'>{it.L('You have reached your withdrawal limit.')}&nbsp;</span>
            </p>
        </div>

        <div className='invisible' id='error_message'>
            <p className='center-text notice-msg' />
        </div>

        <div className='invisible' id='success_form'>
            <p className='gr-padding-10 center-text'>{it.L('Your fund transfer is successful. Your new balances are:')}</p>
            <Fieldset legend={it.L('Details')} className='gr-padding-20'>
                <Row id='from' />
                <Row id='to' />
            </Fieldset>
            <p className='gr-padding-10 center-text'>
                {it.L('If you need further details about transactions, please go to the [_1]statement page[_2].', `<a href='${it.url_for('user/statementws')}'>`, '</a>')}
            </p>
            <p className='center-text'>
                <a className='button' href='javascript:;' id='reset_transfer'><span>{it.L('Make another transfer')}</span></a>
            </p>

            <SeparatorLine className='gr-padding-10' invisible />
        </div>

        <form className='invisible' id='frm_account_transfer'>
            <p className='center-text'>{it.L('Transfer funds between your real money accounts.')}</p>

            <Fieldset legend={it.L('From')}>
                <FormRow label={it.L('Transfer from')} type='label'  id='lbl_transfer_from' />
                <FormRow label={it.L('Amount')}        type='custom' id='transfer_amount'>
                    <label id='currency' />
                    <input id='amount' name='amount' type='text' maxLength='20' autoComplete='off' />
                    <div className='hint' id='range_hint' />
                </FormRow>
            </Fieldset>
            <Fieldset legend={it.L('To')}>
                <FormRow label={it.L('Transfer to')}   type='select' id='transfer_to' />
                <FormRow label={it.L('Amount')}        type='custom' id='transfer_amount'>
                    <input id='amount_to' name='amount_to' type='text' maxLength='20' autoComplete='off' disabled='disabled' />
                    <div className='hint' id='exchange_rate' />
                </FormRow>
            </Fieldset>
            <Fieldset legend={it.L('Fees')}>
                <FormRow label={it.L('Transfer fees')} type='label' id='transfer_fee_lbl' />
                <FormRow label={it.L('Total')}         type='label' id='total_lbl' />
            </Fieldset>

            <SubmitButton msg_id='form_error' type='submit' text={it.L('Transfer')} is_centered />

            <SeparatorLine />
        </form>

        <div className='hint invisible' id='transfer_info'>
            <p>{it.L('Note: Transfer between accounts is not available on weekends.')}</p>
        </div>

        <div className='hint invisible' id='transfer_fee'>
            <p>{it.L('Note: You may only transfer funds between a fiat account and a cryptocurrency account.')}</p>
            <p>{it.L('Transfer funds between your fiat and cryptocurrency accounts for a fee:')}</p>
            <ul className='bullet'>
                <li>{it.L('From fiat to cryptocurrency: [_1] transfer fee', '1%')}</li>
                <li>{it.L('From cryptocurrency to fiat: [_1] transfer fee', '1%')}</li>
            </ul>
        </div>
    </React.Fragment>
);

export default AccountTransfer;

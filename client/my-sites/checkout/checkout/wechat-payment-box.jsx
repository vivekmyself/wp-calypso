/**
 * External dependencies
 */
import { some, isEmpty, get, mapValues, flowRight } from 'lodash';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import page from 'page';
import QRCode from 'qrcode.react';
import { UserAgent } from 'express-useragent';

/**
 * Internal dependencies
 */
import { localize, translate } from 'i18n-calypso';
import notices from 'notices';
import wpcom from 'lib/wp';
import analytics from 'lib/analytics';
import { planMatches } from 'lib/plans';
import { TYPE_BUSINESS, GROUP_WPCOM } from 'lib/plans/constants';
import cartValues, { paymentMethodClassName, getLocationOrigin } from 'lib/cart-values';
import { validatePaymentDetails, maskField, unmaskField } from 'lib/checkout';
import { errorNotice } from 'state/notices/actions';
import getOrderTransaction from 'state/selectors/get-order-transaction';
import getOrderTransactionError from 'state/selectors/get-order-transaction-error';
import { ORDER_TRANSACTION_STATUS } from 'state/order-transactions/constants';
import CartCoupon from 'my-sites/checkout/cart/cart-coupon';
import { Input } from 'my-sites/domains/components/form';
import CartToggle from './cart-toggle';
import PaymentChatButton from './payment-chat-button';
import QueryOrderTransaction from 'components/data/query-order-transaction';
import SubscriptionText from './subscription-text';
import TermsOfService from './terms-of-service';

export class WechatPaymentBox extends PureComponent {
	static propTypes = {
		cart: PropTypes.object.isRequired,
		transaction: PropTypes.object.isRequired,
		redirectTo: PropTypes.func.isRequired, // on success
	};

	constructor( props ) {
		super( props );
		this.state = {
			submitEnabled: true,
			paymentDetails: { name: '' },
			errorMessages: [],
			redirectUrl: null,
			orderId: null,
		};
	}

	handleChange = event => this.updateFieldValues( event.target.name, event.target.value );

	getErrorMessage = fieldName => this.state.errorMessages[ fieldName ];

	getFieldValue = fieldName => this.state.paymentDetails[ fieldName ];

	updateFieldValues = ( name, value ) => {
		this.setState( {
			paymentDetails: {
				...this.state.paymentDetails,
				[ name ]: maskField( name, this.state.paymentDetails[ name ], value ),
			},
		} );
	};

	createField = ( fieldName, componentClass, props ) => {
		const errorMessage = this.getErrorMessage( fieldName ) || [];
		return React.createElement(
			componentClass,
			Object.assign(
				{},
				{
					additionalClasses: 'checkout__checkout-field',
					eventFormName: this.props.eventFormName,
					isError: ! isEmpty( errorMessage ),
					errorMessage: errorMessage[ 0 ],
					name: fieldName,
					onBlur: this.handleChange,
					onChange: this.handleChange,
					value: this.getFieldValue( fieldName ),
					autoComplete: 'off',
					disabled: this.state.formDisabled,
				},
				props
			)
		);
	};

	handleSubmit = event => {
		event.preventDefault();

		const validation = validatePaymentDetails( this.state.paymentDetails, 'wechat' );

		if ( ! isEmpty( validation.errors ) ) {
			this.setState( { errorMessages: validation.errors } );

			return;
		}

		notices.info( translate( 'Setting up your WeChat Pay payment' ) );
		this.setState( { submitEnabled: false } );

		// unmask form values
		const paymentDetails = mapValues( this.state.paymentDetails, ( value, key ) =>
			unmaskField( key, null, value )
		);

		const origin = getLocationOrigin( location );

		const slug = get(this.props, 'selectedSite.slug', 'no-site');

		const dataForApi = {
			payment: Object.assign( {}, paymentDetails, {
				paymentMethod: paymentMethodClassName( 'wechat' ),
				successUrl: origin + this.props.redirectTo(),
				cancelUrl: `${origin}/checkout/${slug}`,
			} ),
			cart: this.props.cart,
			domainDetails: this.props.transaction.domainDetails,
		};

		// get the redirect URL from rest endpoint
		wpcom.undocumented().transactions( 'POST', dataForApi, this.handleSourceSetupResponse);
	}

	handleSourceSetupResponse(error, result) {
		if ( error ) {
			this.setState( { submitEnabled: true } );

			if ( error.message ) {
				notices.error( error.message );
			} else {
				notices.error( translate( "We've encountered a problem. Please try again later." ) );
			}

			return;
		}

		if ( ! result || ! result.redirect_url ) {
			notices.error( translate( "We've encountered a problem. Please try again later." ) );

			return;
		}

		analytics.ga.recordEvent( 'Upgrades', 'Clicked Checkout With Wechat Payment Button' );
		analytics.tracks.recordEvent( 'calypso_checkout_with_redirect_wechat' );

		// The Wechat payment type should only redirect when on mobile as redirect urls
		// are Wechat Pay mobile application urls: e.g. weixin://wxpay/bizpayurl?pr=RaXzhu4
		const userAgent = new UserAgent().parse( navigator.userAgent );

		if ( userAgent.isMobile ) {
			notices.info( translate( 'Redirecting you to the WeChat Pay mobile app to finalize payment.' ) );

			location.assign( result.redirect_url );

			// Redirect on mobile
			return;
		}

		// Display on desktop
		notices.info( translate( 'Please scan the WeChat Payment barcode.', {
			comment: 'Instruction to scan the on screen barcode.'
		} ) );

		this.setState( {
			redirectUrl: result.redirect_url,
			orderId: result.order_id,
		} );
	}

	UNSAFE_componentWillReceiveProps( nextProps ) {
		const slug = get(this.props, 'selectedSite.slug', null);

		const { showErrorNotice } = this.props;

		const { transactionError, transactionStatus, transactionReceiptId } = nextProps;
		// HTTP errors + Transaction errors
		if ( transactionError ||
			transactionStatus === ORDER_TRANSACTION_STATUS.ERROR ||
			transactionStatus === ORDER_TRANSACTION_STATUS.FAILURE
		 ) {

			page( slug ? `/checkout/${ slug }` : '/plans');
			showErrorNotice( translate( "Sorry, we couldn't process your payment. Please try again later." ) );

			return;
		}

		if (transactionStatus === ORDER_TRANSACTION_STATUS.UNKNOWN ) {
			// Redirect users back to the plan page so that they won't be stuck here.
			page( slug ? `/plans/my-plan/${ slug }` : '/plans' );

			showErrorNotice( translate( 'Oops! Something went wrong. Please try again later.' ) );

			return;
		}

		if ( transactionStatus === ORDER_TRANSACTION_STATUS.SUCCESS ) {
			if ( transactionReceiptId ) {
				page( slug ? `/checkout/thank-you/${ slug }/${ transactionReceiptId }` : '/checkout/thank-you/no-site' /* no-site + receiptId errors */ );
			} else {
				page( slug ? `/checkout/thank-you/${ slug }` : '/checkout/thank-you/no-site' );
			}

			return;
		}
	}

	render() {
		// todo: refactor into PaymentChatButton (note duplication in cc,redirect,wechat tests)
		const hasBusinessPlanInCart = some( this.props.cart.products, ( { product_slug } ) =>
			planMatches( product_slug, {
				type: TYPE_BUSINESS,
				group: GROUP_WPCOM,
			} )
		);
		const showPaymentChatButton = this.props.presaleChatAvailable && hasBusinessPlanInCart;

		// Wechat qr codes get set on desktop instead of redirecting
		if ( this.state.redirectUrl ) {
			return <React.Fragment>
				<QueryOrderTransaction orderId={ this.state.orderId } pollIntervalMs={ 1000 } />

				<p className="checkout__payment-qrcode-instruction">
					{ translate( 'Scan the barcode to confirm your %(price)s payment with WeChat Pay.', {
						args: { price: this.props.cart.total_cost_display },
						comment: 'Instruction to scan a QR barcode and finalize payment with WeChat Pay.',
					} )	}
				</p>

				<div className="checkout__payment-qrcode">
					<QRCode value={ this.state.redirectUrl } />
				</div>

				<p className="checkout__payment-qrcode-redirect">
					{ translate( 'On mobile? To open and pay with the WeChat Pay app directly, {{a}}click here{{/a}}.', {
						components: { a: <a href={ this.state.redirectUrl } /> },
						comment: 'Asking if mobile detection has failed and they would like to open and be redirected directly into the WeChat app in order to pay.'
					} ) }
				</p>
			</React.Fragment>
		}

		return <React.Fragment>
			<form onSubmit={ this.handleSubmit }>
				<div className="checkout__payment-box-section">
					{ this.createField( 'name', Input, {
						label: translate( 'Your Name' ),
					} ) }
				</div>

				{ this.props.children }

				<TermsOfService hasRenewableSubscription={ cartValues.cartItems.hasRenewableSubscription( this.props.cart ) } />

				<div className="checkout__payment-box-actions">
					<div className="checkout__pay-button">
						<button type="submit"
							className="checkout__button-pay button is-primary "
							disabled={ ! this.state.submitEnabled }
						>
							{ translate( 'Pay %(price)s with WeChat Pay', {	args: { price: this.props.cart.total_cost_display }	} ) }
						</button>
						<SubscriptionText cart={ this.props.cart } />
					</div>

					{ showPaymentChatButton && (
						<PaymentChatButton paymentType={ this.props.paymentType } cart={ this.props.cart } />
					) }
				</div>
			</form>

			<CartCoupon cart={ this.props.cart } />

			<CartToggle />

		</React.Fragment>;
	}
}

export default connect(
	( state ) =>  {
		const { receiptId, processingStatus } = getOrderTransaction( state, state.orderId );

		return {
			transactionReceiptId: receiptId,
			transactionStatus: processingStatus,
			transactionError: getOrderTransactionError( state, state.orderId ),
		}
	},
	{
		showErrorNotice: errorNotice,
	}
)
)( localize ( WechatPaymentBox ) );

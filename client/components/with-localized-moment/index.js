/**
 * External dependencies
 *
 * @format
 */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';

/**
 * Internal dependencies
 */
import getCurrentLocaleSlug from 'state/selectors/get-current-locale-slug';

function loadMomentLocale( locale ) {
	return import( /* webpackChunkName: "moment-locale-[request]", webpackInclude: /\.js$/ */ `moment/locale/${ locale }` );
}

function getDisplayName( WrappedComponent ) {
	return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export default function( WrappedComponent ) {
	class WithLocalizedMoment extends Component {
		static displayName = `WithLocalizedMoment(${ getDisplayName( WrappedComponent ) })`;

		state = {
			momentLocale: null,
		};

		loadLocale() {
			if ( this.props.locale === this.state.momentLocale ) {
				return;
			}
			if ( this.props.locale !== 'en' ) {
				const loadingLocale = this.props.locale;
				loadMomentLocale( loadingLocale ).then( () => {
					if ( this._mounted && this.props.locale === loadingLocale ) {
						moment.locale( loadingLocale );
						this.setState( { momentLocale: this.props.locale } );
					}
				} );
			} else {
				moment.locale( 'en' );
				this.setState( { momentLocale: 'en' } );
			}
		}

		componentDidMount() {
			this._mounted = true;
			this.loadLocale();
		}

		componentDidUpdate() {
			this.loadLocale();
		}

		componentWillUnmount() {
			this._mounted = false;
		}

		render() {
			return (
				<WrappedComponent
					moment={ moment }
					momentLocale={ this.state.momentLocale }
					{ ...this.props }
				/>
			);
		}
	}

	return connect( state => ( {
		locale: getCurrentLocaleSlug( state ),
	} ) )( WithLocalizedMoment );
}

/** @format */
/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React, { Fragment, PureComponent } from 'react';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import Button from 'components/button';

class ChecklistBannerTask extends PureComponent {
	static propTypes = {
		bannerImageSrc: PropTypes.string,
		buttonText: PropTypes.node,
		completed: PropTypes.bool,
		description: PropTypes.node,
		onClick: PropTypes.func,
		title: PropTypes.node.isRequired,
		translate: PropTypes.func.isRequired,
	};

	render() {
		const { completed, description, onClick, title, translate } = this.props;
		const { buttonText = translate( 'Do it!' ) } = this.props;

		// Banners never render completed Tasks
		if ( completed ) {
			return null;
		}

		/* eslint-disable wpcalypso/jsx-classname-namespace */

		return (
			<Fragment>
				<div className="checklist-banner__content">
					<h3 className="checklist-banner__title">{ title }</h3>
					<p className="checklist-banner__description">{ description }</p>
					<div className="checklist-banner__actions">
						{ onClick && (
							<Button onClick={ onClick } className="checklist-banner__button" primary>
								{ buttonText }
							</Button>
						) }
						{ this.props.children || (
							<a href={ `/checklist/${ this.props.siteSlug }` } className="checklist-banner__link">
								{ this.props.translate( 'View your checklist' ) }
							</a>
						) }
					</div>
				</div>
				{ this.props.bannerImageSrc && (
					<img
						alt=""
						aria-hidden="true"
						className="checklist-banner__image"
						src={ this.props.bannerImageSrc }
					/>
				) }
			</Fragment>
		);
	}
}

export default localize( ChecklistBannerTask );

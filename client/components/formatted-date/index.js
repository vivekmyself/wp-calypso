/**
 * External dependencies
 */
import React, { Component } from 'react';


/**
 * Internal dependencies
 */
import withMoment from 'components/with-localized-moment';

class FormattedDate extends Component {
	static displayName = "FormattedDate";
	render() {
		return <time>{ this.props.moment( this.props.date ).format( this.props.format ) }</time>;
	}
}

export default withMoment( FormattedDate );

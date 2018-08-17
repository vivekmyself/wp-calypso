/** @format */
/**
 * External dependencies
 */
import page from 'page';
import React, { Fragment, PureComponent } from 'react';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { isDesktop } from 'lib/viewport';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import Checklist from 'components/checklist';
import getSiteChecklist from 'state/selectors/get-site-checklist';
import QuerySiteChecklist from 'components/data/query-site-checklist';
import Task from 'components/checklist/task';
import { createNotice } from 'state/notices/actions';
import { getSelectedSiteId } from 'state/ui/selectors';
import { getSiteSlug } from 'state/sites/selectors';
import { loadTrackingTool, recordTracksEvent } from 'state/analytics/actions';
import { requestGuidedTour } from 'state/ui/guided-tours/actions';
import { requestSiteChecklistTaskUpdate } from 'state/checklist/actions';

class WpcomChecklist extends PureComponent {
	componentDidMount() {
		this.props.loadTrackingTool( 'HotJar' );
	}

	isComplete( taskId ) {
		return get( this.props.taskStatuses, [ taskId, 'completed' ], false );
	}

	handleTaskStart = ( { taskId, tourId, url } ) => () => {
		if ( ! tourId && ! url ) {
			return;
		}

		this.props.recordTracksEvent( 'calypso_checklist_task_start', {
			checklist_name: 'jetpack',
			location: 'checklist_show',
			step_name: taskId,
		} );

		if ( tourId && ! this.isComplete( taskId ) && isDesktop() ) {
			this.props.requestGuidedTour( tourId );
		}

		if ( url ) {
			page.show( url );
		}
	};

	handleTaskDismiss = taskId => () => {
		const { siteId } = this.props;

		if ( taskId ) {
			this.props.createNotice( 'is-success', 'You completed a task!' );
			this.props.requestSiteChecklistTaskUpdate( siteId, taskId );
		}
	};

	render() {
		const { siteId, siteSlug, taskStatuses, translate } = this.props;

		return (
			<Fragment>
				{ siteId && <QuerySiteChecklist siteId={ siteId } /> }
				<Checklist isPlaceholder={ ! taskStatuses }>
					<Task
						completed
						completedTitle={ translate( 'You created your site' ) }
						description={ translate( 'This is where your adventure begins.' ) }
						title={ translate( 'Create your site' ) }
					/>
					<Task
						completed
						completedTitle={ translate( 'You picked a website address' ) }
						description={ translate( 'Choose an address so people can find you on the internet.' ) }
						title={ translate( 'Pick a website address' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/personalize-your-site.svg"
						completed={ this.isComplete( 'blogname_set' ) }
						completedButtonText={ translate( 'Edit' ) }
						completedTitle={ translate( 'You updated your site title' ) }
						description={ translate( 'Give your site a descriptive name to entice visitors.' ) }
						duration={ translate( '%d minute', '%d minutes', { count: 1, args: [ 1 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'blogname_set',
							tourId: 'checklistSiteTitle',
							url: `/settings/general/${ siteSlug }`,
						} ) }
						onDismiss={ this.handleTaskDismiss( 'blogname_set' ) }
						title={ translate( 'Give your site a name' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/upload-icon.svg"
						completed={ this.isComplete( 'site_icon_set' ) }
						completedButtonText={ translate( 'Change' ) }
						completedTitle={ translate( 'You uploaded a site icon' ) }
						description={ translate(
							'Help people recognize your site in browser tabs — just like the WordPress.com W!'
						) }
						duration={ translate( '%d minute', '%d minutes', { count: 1, args: [ 1 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'site_icon_set',
							tourId: 'checklistSiteIcon',
							url: `/settings/general/${ siteSlug }`,
						} ) }
						onDismiss={ this.handleTaskDismiss( 'site_icon_set' ) }
						title={ translate( 'Upload a site icon' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/create-tagline.svg"
						completed={ this.isComplete( 'blogdescription_set' ) }
						completedButtonText={ translate( 'Change' ) }
						completedTitle={ translate( 'You created a tagline' ) }
						description={ translate(
							'Pique readers’ interest with a little more detail about your site.'
						) }
						duration={ translate( '%d minute', '%d minutes', { count: 2, args: [ 2 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'blogdescription_set',
							tourId: 'checklistSiteTagline',
							url: `/settings/general/${ siteSlug }`,
						} ) }
						onDismiss={ this.handleTaskDismiss( 'blogdescription_set' ) }
						title={ translate( 'Create a tagline' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/upload-profile-picture.svg"
						completed={ this.isComplete( 'avatar_uploaded' ) }
						completedButtonText={ translate( 'Change' ) }
						completedTitle={ translate( 'You uploaded a profile picture' ) }
						description={ translate(
							'Who’s the person behind the site? Personalize your posts and comments with a custom profile picture.'
						) }
						duration={ translate( '%d minute', '%d minutes', { count: 2, args: [ 2 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'avatar_uploaded',
							tourId: 'checklistUserAvatar',
							url: '/me',
						} ) }
						onDismiss={ this.handleTaskDismiss( 'avatar_uploaded' ) }
						title={ translate( 'Upload your profile picture' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/contact.svg"
						completed={ this.isComplete( 'contact_page_updated' ) }
						completedButtonText={ translate( 'Edit' ) }
						completedTitle={ translate( 'You updated your Contact page' ) }
						description={ translate(
							'Encourage visitors to get in touch — a website is for connecting with people.'
						) }
						duration={ translate( '%d minute', '%d minutes', { count: 2, args: [ 2 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'contact_page_updated',
							tourId: 'checklistContactPage',
							url: `/post/${ siteSlug }/2`,
						} ) }
						onDismiss={ this.handleTaskDismiss( 'contact_page_updated' ) }
						title={ translate( 'Personalize your Contact page' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/first-post.svg"
						completed={ this.isComplete( 'post_published' ) }
						completedButtonText={ translate( 'Edit' ) }
						completedTitle={ translate( 'You published your first blog post' ) }
						description={ translate( 'Introduce yourself to the world! That’s why you’re here.' ) }
						duration={ translate( '%d minute', '%d minutes', { count: 10, args: [ 10 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'post_published',
							tourId: 'checklistPublishPost',
							url: `/post/${ siteSlug }`,
						} ) }
						onDismiss={ this.handleTaskDismiss( 'post_published' ) }
						title={ translate( 'Publish your first blog post' ) }
					/>
					<Task
						bannerImageSrc="/calypso/images/stats/tasks/custom-domain.svg"
						completed={ this.isComplete( 'custom_domain_registered' ) }
						completedButtonText={ translate( 'Change' ) }
						completedTitle={ translate( 'You registered a custom domain' ) }
						description={ translate(
							'Memorable domain names make it easy for people to remember your address — and search engines love ’em.'
						) }
						duration={ translate( '%d minute', '%d minutes', { count: 2, args: [ 2 ] } ) }
						onClick={ this.handleTaskStart( {
							taskId: 'custom_domain_registered',
							tourId: 'checklistDomainRegister',
							url: `/domains/add/${ siteSlug }`,
						} ) }
						onDismiss={ this.handleTaskDismiss( 'custom_domain_registered' ) }
						title={ translate( 'Register a custom domain' ) }
					/>
				</Checklist>
			</Fragment>
		);
	}
}

export default connect(
	state => {
		const siteId = getSelectedSiteId( state );
		return {
			siteId,
			siteSlug: getSiteSlug( state, siteId ),
			taskStatuses: get( getSiteChecklist( state, siteId ), [ 'tasks' ] ),
		};
	},
	{
		createNotice,
		loadTrackingTool,
		recordTracksEvent,
		requestGuidedTour,
		requestSiteChecklistTaskUpdate,
	}
)( localize( WpcomChecklist ) );

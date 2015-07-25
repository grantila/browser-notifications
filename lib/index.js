'use strict';

var permDeferred = null;

module.exports = function( Promise )
{
	return {
		isSupported        : isSupported,
		isPermitted        : isPermitted.bind( Promise ),
		requestPermissions : requestPermissions.bind( Promise ),
		create             : create.bind( Promise ),
		send               : send.bind( Promise )
	};
};

function makeDefault( func )
{
	if ( !global.Promise )
		throw new Error( "The platform doesn't natively support promises" );

	var defaults = module.exports( global.Promise );
	Object.keys( defaults ).forEach( function( func ) {
		module.exports[ func ] = defaults[ func ];
	} );
}

// Provide default functions using the built-in Promise if available.
makeDefault( );

function defer( Promise )
{
	var deferred = { };
	deferred.promise = new Promise( function( resolve, reject ) {
		deferred.resolve = resolve;
		deferred.reject = reject;
	} );
	return deferred;
}

function isSupported( )
{
	return !!( "Notification" in window );
}

function _convertPermission( perm )
{
	if ( perm === "granted" )
		return true;
	else if ( perm === "denied" )
		return false;
	else
		return null;
}

/**
 * Checks whether notifications are permitted. Asynchronously returns
 * true, false or null if it is unknown and needs to be requested.
 *
 * @return P{Boolean || null}
 */
function isPermitted( )
{
	var Promise = this;

	if ( permDeferred )
		return permDeferred.promise;

	permDeferred = defer( Promise );

	permDeferred.resolve( _convertPermission( Notification.permission ) );

	return permDeferred.promise;
}

/**
 * Request permission for notifications. If we already have, this is
 * basically a no-op, so it is safe to just call if you want permission,
 * but not ask in vain.
 *
 * If you *only* want to know, use isPermitted().
 *
 * @return P{Boolean || null}
 */
function requestPermissions( )
{
	var Promise = this;

	function performRequest( )
	{
		permDeferred = defer( Promise );

		try
		{
			Notification.requestPermission( function( permission ) {
				permDeferred.resolve( _convertPermission( permission ) );
			} );
		}
		catch ( err )
		{
			permDeferred.reject( err );
		}

		return permDeferred.promise;
	}

	if ( !permDeferred )
		// Check if we already are allowed
		isPermitted.call( Promise );

	return permDeferred.promise.then( function( isPermitted ) {
		if ( isPermitted === true )
			return isPermitted;
		// Unknown or false - request permission
		return performRequest( );
	} );
}

var DEFAULT_TIMEOUT = 4000;

/**
 * Spawns a new notification and returns it. Will automatically close
 * after <timeout> milliseconds, unless timeout is explicitly null. Will
 * default to 4000 milliseconds.
 *
 * @return Notification
 */
function create( title, body, iconUrl, timeout /* = DEFAULT_TIMEOUT */ )
{
	var options = { };
	if ( body )
		options.body = body;
	if ( iconUrl )
		options.iconUrl = body;
	var notification = new Notification( title, options );

	if ( timeout !== null )
	{
		if ( typeof timeout === 'undefined' )
			timeout = DEFAULT_TIMEOUT;
		setTimeout( notification.close.bind( notification ), timeout );
	}

	return notification;
}

/**
 * Same as create(), but returns a promise which is fulfilled when the
 * notification is clicked, or rejected if there is an error.
 * Takes the same arguments as create(), except that if the browser doesn't
 * support the 'close' event, a default timeout is automatically enforced. The
 * returned promise would otherwise risk never to be resolved.
 *
 * @return P{Boolean} Resolves to true if the notification was clicked
 */
function send( title, body, iconUrl, timeout )
{
	var Promise = this;
	var forcedTimeout = undefined;
	if ( !( 'onclose' in Notification.prototype ) && !timeout )
		forcedTimeout = DEFAULT_TIMEOUT;

	var notification = create.call(
		this, title, body, iconUrl, timeout || forcedTimeout );

	function cleanup( )
	{
		notification.removeEventListener( 'click', onClick );
		notification.removeEventListener( 'error', onError );
		notification.removeEventListener( 'close', onClose );
	}

	var deferred = defer( Promise );

	function onClick( )
	{
		deferred.resolve( true );
		cleanup( );
	}

	function onError( event )
	{
		var err = new Error( 'Notification failed' );
		err.event = event;
		deferred.reject( err );
		cleanup( );
	}

	function onClose( )
	{
		deferred.resolve( false );
		cleanup( );
	}

	notification.addEventListener( 'click', onClick );
	notification.addEventListener( 'error', onError );
	notification.addEventListener( 'close', onClose );

	if ( forcedTimeout !== undefined )
		// We have a forced timeout. Resolve promise when it elapses.
		setTimeout( deferred.resolve.bind( null, false ), forcedTimeout );

	return deferred.promise;
}

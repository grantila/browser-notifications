# Browser notifications

## Synopsis

This library provides a promise-based wrapper on top of the native implementation, intended to be simpler and safer to use. The developer can choose to use the browser built-in (native) promises, or inject any other A+ promise implementation.

## Motivation

Modern browsers support the Notifications API defined by the WHATWG. The API is pretty small and well documentated and not too complex. There are however a few things that can go wrong, and race conditions can occur if the developer isn't careful. One example is the is `isPermitted()` function which in this library returns a Promise. The core logic is strictly synchronous, so one might wonder why it needs to be promisified? The reason is that there might be an ongoing request for permission while running `isPermitted()`, which in this case will be awaited. The native implementation leaves all such control flow handling to the developer.

## API

### Require

browser-notifications is required as any other CommonJS package:

```js
var browserNotifications = require( 'browser-notifications' );
```

or inject your favorite promise implementation into it, to ensure that
 * It works on browsers which don't have native Promises
 * The promises you get back have the functionality you desire

```js
var Promise = require( 'bluebird' );
var browserNotifications = require( 'browser-notifications' )( Promise );
```

### Check browser support

```js
isSupported( ) // -> Boolean
```

### Check and request for permission

`isPermitted( )` eventually returns either a Boolean whether permission is granted (true) or denied (false), or null meaning it still is unknown. Calling this function will not cause a dialog to appear in the browser, it is simply a passive call.

```js
isPermitted( ) // -> Promise{ Boolean || null }
```

`requestPermissions( )` should be called if you want to show notifications, either because `isPermitted( )` hinted this wasn't already permitted, or because you simply want to try. First time, the browser will show a little dialog to ask the user for permission for the given site.

The function returns the same as `isPermitted( )` with the same semantics.

```js
requestPermissions( ) // Promise{ Boolean || null }
```

### Show a notification

There are two functions for showing a notification. The bare `create( )` and the easier (and preferred) `send( )`. They take the same arguments.

The `body`, `iconUrl` and `timeout` arguments are optional, but need to exist in the same order, i.e. if only timeout is specified, the other must be specified too, as `null`.

For `send( )`, `timeout` will be enforced if the browser doesn't support the 'close' event for notifications. Otherwise, the returned Promise would never be resolved. This is because some browsers automatically will close the notification after a certain timeout.

```js
create( title [, body [, iconUrl [, timeout ] ] ] ); // -> Notification object
send( title [, body [, iconUrl [, timeout ] ] ] ); // -> Promise{ Boolean }
```

The `send( )` function returns a Promise which will be resolved to true if the notification was clicked, and false if it timed out (and dissapeared). It will be rejected if there was an error with this notification.

## Example

```js
var Promise = require( 'bluebird' );
var browserNotifications = require( 'browser-notifications' )( Promise );

if ( browserNotifications.isSupported( ) )
{
	browserNotifications.requestPermissions( )
	.then( function( isPermitted ) {
		if ( isPermitted )
			return browserNotifications.send( "My title", "My body" )
			.then( function( wasClicked ) {
				console.log( "The notification was clicked: ", wasClicked );
			} );
		else
			console.log( "We asked for permission, but got denied" );
	} )
	.catch( function( err ) {
		console.error( "An error occured", err );
	} );
}
```

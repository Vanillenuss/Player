	
	/**
	 * Release date: 09.03.15
	 */

	var WikitudePlugin = function() {

		/**
		 *  This is the SDK Key, provided to you after you purchased the Wikitude SDK from http =//www.wikitude.com/store/.
		 *  You can obtain a free trial key at http =//www.wikitude.com/developer/licenses .
		 */
		this._sdkKey = "mewxD8jgpIu5zG5xwwBm5OmvtGx8qYpZMGTdOkKjdhre9sxg4tXNY9FAmEMnoqELgZjMWWCIxckg8PG0kyvtlKgz5MWnUQ85BbNnioIlnN6x32DGLC601iDi6UaIhW2gLhw2Qq3/jt29sLs34ijSsyIu6CclwJ7nnFd0jyA/20VTYWx0ZWRfX/TPO8Nm42DmP7AIWlEewbZBTfcaSgj43JS58J2xgImGLX+eua7KamsvCbtH3oY7y+WJW0XepMOnvMixYFeH7G5rftKKOoiOr1Z1H1smb7zwaNKoibiL97NjFq8/es3Yd4oqGoDj6/o869+1zpBd+WiN62I764Haz5kcaVfUNrhu783qGBss9UY6+EqTM5EiT0fqBoE0EWuHYTeOeFWPExarGJPJkEjYrH5peDY/7ld/3k6ExmQCwg4d387VsbK6yhJ/9ChzekOGUCLxGQyhqeZOxK7dLT9dnuwGoIhW8MpnyrFrbzdoJEQPh7O1bR/vcN8WeNLPvizJ7qTWaAJC8Ra1xHoOHGzIvjZXdk0GUvwYqn6IwY9MMOLsh3rSmNpheLD5P0FlKEwb/I4lLf2+eZyMGaeJc8n0HnI2n4l66xjep8bpRRoR0u55VqGaSNAMBoDQeEpFUFVs52n14XizaaCGsbIga/vGYDQDLlZw0r5s5FvEIk89Lc+c4m7VD+INiBQ3UAwB/jFOdughN6oqWmWJbj4pKkfyog0Ylyk2Dm1D57P0u7nuEbRvYSsAiHQnA/aFGRbpuhDd"; //"gXdMg+cEuIcKykQ+s0SfzM1hDjuxNRkxr/q/9d76evEYyqMTKGGSaFdKkLAx3G3HHQ3iASqnZA5syCEyRcueTbt4JipuFe5klcZb9QstFFcj3k74eCaK91lzDiSRw7xLCvBiMrPIN1vRQq8w3TcF3/yMWzsgmimeDZiqi6pkIV9TYWx0ZWRfX6CgGM0+GZPXPtX92quHKr3XammqGtHP1vHFAmz4GTVlUO8pX8fcGnS0PqsKAg6mGX7Dr78jRw+JbNSoFGrLK5fD4WQ5BLuZoH4h1Y38jMdELnHAEVp+CC5THTQDaRzRO++0n8VXWhyEuixMZ78xqI2CEe3VSgVJS4DDhdZIWYeMIW+UxwzzeqMHBIl2EI6tMCYw0chh6PYIzC5Mo2pXSc6MIFT4JLzEKAGHxRz031VcEtf9idDrtxGpjxY7vn9pNcJP5+MOGqGFKkc5quS4SDTsZ4bkabv+3wSylWLGGV6uHN4hNP6VK351X1xsEWuJP704l2U4i7E3D5vuLl6PQEA4v9zEXJFWDL+qrg4vFW0aVzLAK3lFLzq63hEf5kduplWg5VRW3VZZqYgr2iSJp7B8kVMhMIaL0q2jSIhQMkxhYolsEYXN5dVCMvf3Vjrr+olriWbwJ/0bT9XUORJ+f5y4v0/FRPwltloQ/HRQsTKUlr3krjZzlSs=";

		/**
		 *  The Wikitude SDK can run in different modes.
		 *      * Geo means, that objects are placed at latitude/longitude positions.
		 *      * IR means that only image recognition is used in the ARchitect World.
		 *  When your ARchitect World uses both, geo and ir, than set this value to "IrAndGeo". Otherwise, if the ARchitectWorld only needs image recognition, placing "IR" will require less features from the device and therefore, support a wider range of devices. Keep in mind that image recognition requires a dual core cpu to work satisfyingly.
		 */
        this.FeatureGeo         = "geo";
        this.Feature2DTracking  = "2d_tracking";

        /**
         *  Start-up configuration: camera position (front or back).
         */
        this.CameraPositionUndefined = 0;
        this.CameraPositionFront     = 1;
        this.CameraPositionBack      = 2;
                       
        /**
         *  Start-up configuration: camera focus range restriction (for iOS only).
         */
        this.CameraFocusRangeNone = 0;
        this.CameraFocusRangeNear = 1;
        this.CameraFocusRangeFar  = 2;
        
	};


	/*
	 *	=============================================================================================================================
	 *
	 *	PUBLIC API
	 *
	 *	=============================================================================================================================
	 */

	/* Managing ARchitect world loading */

	/**
	 *  Use this function to check if the current device is capable of running ARchitect Worlds.
	 *
	 * @param {function} successCallback A callback which is called if the device is capable of running ARchitect Worlds.
	 * @param {function} errorCallback A callback which is called if the device is not capable of running ARchitect Worlds.
	 */
	WikitudePlugin.prototype.isDeviceSupported = function(successCallback, errorCallback, requiredFeatures) {

		// Check if the current device is capable of running Architect Worlds
		cordova.exec(successCallback, errorCallback, "WikitudePlugin", "isDeviceSupported", [requiredFeatures]);
	};

	/**
	 *	Use this function to load an ARchitect World.
	 *
     *  @param {function(loadedURL)}  		successCallback		function which is called after a successful launch of the AR world.
     *  @param {function(error)}		 	errorCallback		function which is called after a failed launch of the AR world.
     *	@param {String} 					architectWorldPath	The path to a local ARchitect world or to a ARchitect world on a server or your 
	 *  @param {String} 					worldPath			path to an ARchitect world, either on the device or on e.g. your Dropbox.
     *  @param {Array} 						requiredFeatures	augmented reality features: a flags mask for enabling/disabling 
     *                                  geographic location-based (WikitudePlugin.FeatureGeo) or image recognition-based (WikitudePlugin.Feature2DTracking) tracking.
	 *  @param {json object} (optional) startupConfiguration	represents the start-up configuration which may look like the following:
	 *									{
	 *                               		"cameraPosition": app.WikitudePlugin.CameraPositionBack,
	 *                                  	    	"*OptionalPlatform*": {
	 *											"*optionalPlatformKey*": "*optionalPlatformValue*"
	 *                                      	}
	 *                               	}
	 */	 
	WikitudePlugin.prototype.loadARchitectWorld = function(successCallback, errorCallback, architectWorldPath, requiredFeatures, startupConfiguration) {
        
		cordova.exec(successCallback, errorCallback, "WikitudePlugin", "open", [{
				"SDKKey": this._sdkKey,
				"ARchitectWorldURL": architectWorldPath,
				"RequiredFeatures": requiredFeatures,
		    	"StartupConfiguration" : startupConfiguration
			}]);
		
		// We add an event listener on the resume and pause event of the application life-cycle
		document.addEventListener("resume", this.onResume, false);
		document.addEventListener("pause", this.onPause, false);
		document.addEventListener("backbutton", this.onBackButton, false);
	};

	/* Managing the Wikitude SDK Lifecycle */
	/**
	 *	Use this function to stop the Wikitude SDK and to remove it from the screen.
	 */
	WikitudePlugin.prototype.close = function() {

		document.removeEventListener("pause", this.onPause, false);
		document.removeEventListener("resume", this.onResume, false);
		document.removeEventListener("backbutton", this.onBackButton, false);
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "close", [""]);
	};

	/**
	 *	Use this function to only hide the Wikitude SDK. All location and rendering updates are still active.
	 */
	WikitudePlugin.prototype.hide = function() {
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "hide", [""]);
	};

	/**
	 *	Use this function to show the Wikitude SDK again if it was hidden before.
	 */
	WikitudePlugin.prototype.show = function() {
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "show", [""]);
	};

	/* Interacting with the Wikitude SDK */

	/**
	 *	Use this function to call JavaScript which will be executed in the context of the currently loaded ARchitect World.
	 *
	 * @param js The JavaScript that should be evaluated in the ARchitect View.
	 */
	WikitudePlugin.prototype.callJavaScript = function(js) {
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "callJavascript", [js]);
	};

	/**
	 *	Use this function to set a callback which will be invoked when the ARchitect World opens an architectsdk =// url.
	 *	document.location = "architectsdk =//opendetailpage?id=9";
	 *
	 *	@param onUrlInvokeCallback A function which will be called when the ARchitect World invokes a call to "document.location = architectsdk =//"
	 */
	WikitudePlugin.prototype.setOnUrlInvokeCallback = function(onUrlInvokeCallback) {
		cordova.exec(onUrlInvokeCallback, this.onWikitudeError, "WikitudePlugin", "onUrlInvoke", [""]);
	};

	/**
	 *  Use this function to inject a location into the Wikitude SDK.
	 *
	 *  @param latitude The latitude which should be simulated
	 *  @param longitude The longitude which should be simulated
	 *  @param altitude The altitude which should be simulated
	 *  @param accuracy The simulated location accuracy
	 */
	WikitudePlugin.prototype.setLocation = function(latitude, longitude, altitude, accuracy) {
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "setLocation", [latitude, longitude, altitude, accuracy]);
	};

	/**
	 *  Use this function to generate a screenshot from the current Wikitude SDK view.
	 *
     *  @param {function(ur)}  successCallback  function which is called after the screen capturing succeeded.
     *  @param {function(err)} errorCallback    function which is called after capturing the screen has failed.
	 *  @param includeWebView Indicates if the ARchitect web view should be included in the generated screenshot or not.
	 *  @param imagePathInBundleorNullForPhotoLibrary If a file path or file name is given, the generated screenshot will be saved in the application bundle. Passing null will save the photo in the device photo library.
	 */
	WikitudePlugin.prototype.captureScreen = function(successCallback, errorCallback, includeWebView, imagePathInBundleOrNullForPhotoLibrary)
    {
		cordova.exec(successCallback, errorCallback, "WikitudePlugin", "captureScreen", [includeWebView, imagePathInBundleOrNullForPhotoLibrary]);
	};
	
	/**
	 * Use this function to set a callback that is called every time the Wikitude SDK encounters an internal error or warning. 
	 * Internal errors can occur at any time and might not be related to any WikitudePlugin function invocation.
	 * An error code and message are passed in form of a JSON object.
	 *
	 *  @param {function(jsonObject)}  errorHandler  function which is called every time the SDK encounters an internal error.
	 *
	 * NOTE: The errorHandler is currently only called by the Wikitude iOS SDK!
	 */
	WikitudePlugin.prototype.setErrorHandler = function(errorHandler)
	{
		cordova.exec(this.onWikitudeOK, errorHandler, "WikitudePlugin", "setErrorHandler", []);
	}

	/*
	 *	=============================================================================================================================
	 *
	 *	Callbacks of public functions
	 *
	 *	=============================================================================================================================
	 */


	/* Lifecycle updates */
	/**
	 *	This function gets called every time the application did become active.
	 */
	WikitudePlugin.prototype.onResume = function() {

		// Call the Wikitude SDK that it should resume.
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "onResume", [""]);
	};

	/* Lifecycle updates */
	/**
	 *	This function gets called every time the application did become active.
	 */
	WikitudePlugin.prototype.onBackButton = function() {

		// Call the Wikitude SDK that it should resume.
		//cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "close", [""]);
		WikitudePlugin.prototype.close();
	};

	/**
	 *	This function gets called every time the application is about to become inactive.
	 */
	WikitudePlugin.prototype.onPause = function() {

		// Call the Wikitude SDK that the application did become inactive
		cordova.exec(this.onWikitudeOK, this.onWikitudeError, "WikitudePlugin", "onPause", [""]);
	};

	/**
	 *	A generic success callback used inside this wrapper.
	 */
	WikitudePlugin.prototype.onWikitudeOK = function() {};

	/**
	 *  A generic error callback used inside this wrapper.
	 */
	WikitudePlugin.prototype.onWikitudeError = function() {};



	/* Export a new WikitudePlugin instance */
	var wikitudePlugin = new WikitudePlugin();
	module.exports = wikitudePlugin;
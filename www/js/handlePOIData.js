function loadPOIData() {
  setContentVisibility(false);
  setHeaderControlsVisibility(false);

  var lat = localStorage.getItem('lat') || app.cons.LAT_LUEBECK;
  var lng = localStorage.getItem('lon') || app.cons.LNG_LUEBECK;
  
  var requestUrl = app.cons.SERVER_URL + app.cons.POI_URL + "lat=" + lat + "&lng=" + lng + "&distance=" + app.cons.DISTANCE + "&id=" + app.data.currentTour.id;
  $.ajax({
    url: requestUrl,
    dataType: 'json',
    xhrFields: {
      withCredentials: true
    },
    crossDomain: true,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('pragma', 'no-cache');
      xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
  }).done(function(data) {

      
    if(data[0].length > 0) {

      var PoiFromServer = [];
      var PoiFromServerIDList = [];
      if(data[0].length > 0) {
        prepareMediaAndFillDownloadQueue(PoiFromServer, PoiFromServerIDList, data[0], 'Poi');
      }

      var PoiContentFromServer = [];
      var PoiContentFromServerIDList = [];
      if(data[1].length > 0) {
        prepareMediaAndFillDownloadQueue(PoiContentFromServer, PoiContentFromServerIDList, data[1], 'PoiContent');
      }

      var PoiRecognitionFromServer = [];
      var PoiRecognitionFromServerIDList = [];
      if(data[2].length > 0) {
        prepareMediaAndFillDownloadQueue(PoiRecognitionFromServer, PoiRecognitionFromServerIDList, data[2], 'PoiRecognition');
      }

      // store all POIs for active tourdate in localStorage (although WebSQL is much better, it can't be used due to Wikitude causing an SECURITY_ERR)
      try{
        var PoiFromLocalDBIDList = [];
        var PoiContentFromLocalDBIDList = [];
        var PoiRecognitionFromLocalDBIDList = [];

        var WEB_DB = new $IGDB.Context({provider: 'LocalStore', databaseName: 'WEB_DB'});
        WEB_DB.onReady(function() {

          // go through all existing POIs in local db
          WEB_DB.Pois.filter("tour_id", "==", app.data.currentTour.id).forEach(function (item) {

            // if poi was modified or is not present in the list of new poi from the server delete it from local db
            var idx = PoiFromServerIDList.indexOf(parseInt(item.id, 10));
            var modified = (idx == -1) || (item.modified < PoiFromServer[idx].modified);
            if(modified) {
              WEB_DB.Pois.remove(item);
              if(item.icon_file != "") FileHandler.removeFile(item.icon_file);
            } else {
              PoiFromLocalDBIDList.push(parseInt(item.id, 10));
            }
          }).done(function(){
            WEB_DB.saveChanges().then(function(){

              // go through all POIs from server
              for (var i = 0; i < PoiFromServer.length; i++) {
                // if POI is not present in local db yet add it
                var idx = PoiFromLocalDBIDList.indexOf(parseInt(PoiFromServer[i].id, 10));
                if(idx == -1) {
                  WEB_DB.Pois.add(PoiFromServer[i]);
                }
              }
              WEB_DB.saveChanges();

              // go through all existing POI-Contents in local db
              WEB_DB.PoiContents.filter("tour_id", "==", app.data.currentTour.id).forEach(function (item) {

                // if poi was modified or is not present in the list of new poi from the server delete it from local db
                var idx = PoiContentFromServerIDList.indexOf(parseInt(item.id, 10));
                var modified = (idx == -1) || (item.modified < PoiContentFromServer[idx].modified);
                if(modified) {
                  WEB_DB.PoiContents.remove(item);
                  if(item.media_file != "") FileHandler.removeFile(item.media_file);
                } else {
                  PoiContentFromLocalDBIDList.push(parseInt(item.id, 10));
                }
              }).done(function(){
                WEB_DB.saveChanges().then(function(){

                  // go through all POI-Contents from server
                  for (var i = 0; i < PoiContentFromServer.length; i++) {
                    // if POI-Content is not present in local db yet add it
                    var idx = PoiContentFromLocalDBIDList.indexOf(parseInt(PoiContentFromServer[i].id, 10));
                    if(idx == -1) {
                      WEB_DB.PoiContents.add(PoiContentFromServer[i]);
                    }
                  }
                  WEB_DB.saveChanges();


                  // go through all existing POI-Recognitions in local db
                  WEB_DB.PoiRecognitions.filter("tour_id", "==", app.data.currentTour.id).forEach(function (item) {

                    // if POI-Recognition was modified or is not present in the list of new POI-Recognitions from the server delete it from local db
                    var idx = PoiRecognitionFromServerIDList.indexOf(parseInt(item.id, 10));
                    var modified = (idx == -1) || (item.modified < PoiRecognitionFromServer[idx].modified);
                    if(modified) {
                      WEB_DB.PoiRecognitions.remove(item);
                      if(item.wt3_file != "") FileHandler.removeFile(item.wt3_file);
                      if(item.overlay_file != "") FileHandler.removeFile(item.overlay_file);
                      if(item.media_file != "") FileHandler.removeFile(item.media_file);
                    } else {
                      PoiRecognitionFromLocalDBIDList.push(parseInt(item.id, 10));
                    }
                  }).done(function(){
                    WEB_DB.saveChanges().then(function(){

                      // go through all POI-Recognitions from server
                      for (var i = 0; i < PoiRecognitionFromServer.length; i++) {
                        // if POI-Recognition is not present in local db yet add it
                        var idx = PoiRecognitionFromLocalDBIDList.indexOf(parseInt(PoiRecognitionFromServer[i].id, 10));
                        if(idx == -1) {
                          WEB_DB.PoiRecognitions.add(PoiRecognitionFromServer[i]);
                        }
                      }
                      WEB_DB.saveChanges();

                      var params = JSON.stringify({
                        "tour_id": app.data.currentTour.id,
                        "latitude": lat,
                        "longitude": lng,
                        "local_url": FileHandler.data.localPath,
                        "server_url": app.cons.SERVER_URL,
                        "wtc_file": app.data.currentTour.wtc_file,
                        "pois_with_gps": app.data.currentTour.pois_with_gps,
                        "pois": PoiFromServer,
                        "poi_contents": PoiContentFromServer,
                        "poi_recognitions": PoiRecognitionFromServer,
                        "UUID": localStorage.getItem('UUID'),
                        "access_anywhere": app.data.currentTour.access_anywhere,
                        "distance": app.cons.DISTANCE,
                        "language": localStorage.getItem('_language'),
                        "story_id": app.data.selectedNarration,
                        "session_id": app.data.selectedSession,
                        "nextState": app.data.nextState
                      });

                      
                      FileHandler.downloadFiles();
                      
                      
                      // load AR world only when all downloads have finished
                      FileHandler.data.downloadTimer = setInterval(function() {

                        if(FileHandler.data.downloadQueue.length <= 0 && FileHandler.data.bytesReceived == FileHandler.data.bytesTotal) {
                          setContentVisibility(true);
                          setDownloadProgressVisibility(false);
                          clearInterval(FileHandler.data.downloadTimer);
                          FileHandler.data.bytesTotal = 0;
                          FileHandler.data.bytesReceived = 0;
                          FileHandler.updateDownloadProgressValue();

                          app.loadARchitectWorld();
                          
                          setTimeout(function(){
                            app.wikitudePlugin.callJavaScript("World.init('" + params + "');");
                          }, FileHandler.data.waitForResponse * 4);
                        } else {
                          FileHandler.updateDownloadProgressValue();
                        }
                      }, FileHandler.data.waitForResponse);


                    });
                  }); // WEB_DB.PoiRecognitions end


                });
              }); // WEB_DB.PoiContents end


            });
          }); // WEB_DB.Pois end


        }); // WEB_DB.onReady end
      } catch(e) {
        // POIs couldn't be stored in local db
        setContentVisibility(true);
        setHeaderControlsVisibility(true);
      }

    } else {
      setContentVisibility(true);
      setHeaderControlsVisibility(true);
      var text = 'Diese Tour enthält keine POIs.';
      switch(localStorage.getItem('_language')) {
        case 'en': text = 'This tour does not have any POIs.'; break;
      }
      alert(text);
    }

  }).fail(function(jqXHR, textStatus) {
      console.log("POI request failed: " + textStatus);

    // when there is no internet connection restore the latest tourdates from localStorage
    try {
        
      var WEB_DB = new $IGDB.Context({provider: 'LocalStore', databaseName: 'WEB_DB'});
      WEB_DB.onReady(function(){

        // load all existing POIs of this specific tour
        WEB_DB.Pois.filter("tour_id", "==", app.data.currentTour.id).toArray().done(function(PoiFromLocalDB) {
          if(PoiFromLocalDB.length > 0) {

            // load all existing POI-Contents of this specific tour
            WEB_DB.PoiContents.filter("tour_id", "==", app.data.currentTour.id).toArray().done(function (PoiContentFromLocalDB) {

              // load all existing POI-Recognitions of this specific tour
              WEB_DB.PoiRecognitions.filter("tour_id", "==", app.data.currentTour.id).toArray().done(function (PoiRecognitionFromLocalDB) {
              
                app.loadARchitectWorld();
                
                var params = JSON.stringify({
                  "tour_id": tour_id,
                  "latitude": lat,
                  "longitude": lng,
                  "local_url": FileHandler.data.localPath,
                  "server_url": app.cons.SERVER_URL,
                  "wtc_file": app.data.currentTour.wtc_file,
                  "pois_with_gps": app.data.currentTour.pois_with_gps,
                  "pois": PoiFromLocalDB,
                  "poi_contents": PoiContentFromLocalDB,
                  "poi_recognitions": PoiRecognitionFromLocalDB,
                  "UUID": localStorage.getItem('UUID'),
                  "access_anywhere": app.data.currentTour.access_anywhere,
                  "distance": app.cons.DISTANCE,
                  "language": localStorage.getItem('_language'),
                  "story_id": app.data.selectedNarration,
                  "session_id": app.data.selectedSession,
                  "nextState": app.data.nextState
                });
          
                app.wikitudePlugin.callJavaScript("World.init('" + params + "');");
              });
            });
          } else {
            setContentVisibility(true);
            setHeaderControlsVisibility(true);
            var text = 'Es ist ein Fehler aufgetreten. Überprüfe Deine Internet Verbindung.';
            switch(localStorage.getItem('_language')) {
              case 'en': text = 'An error has occurred. Please check your internet connection.'; break;
            }
            alert(text);
          }
        });
      });
    } catch(e) {
      setContentVisibility(true);
      setHeaderControlsVisibility(true);
      var text = 'Es ist ein Fehler aufgetreten. Überprüfe Deine Internet Verbindung.';
      switch(localStorage.getItem('_language')) {
        case 'en': text = 'An error has occurred. Please check your internet connection.'; break;
      }
      alert(text);
    }
  });
}

function prepareMediaAndFillDownloadQueue(objList, IDList, data, type) {

  for(var i = 0; i < data.length; i++) {
    objList[i] = {};
    IDList.push(parseInt(data[i].id, 10));
    
    var hasStrongConnection = isWifiOrEthernetConnection();

    objList[i].id = parseInt(data[i].id, 10);
    objList[i].tour_id = parseInt(app.data.currentTour.id, 10);
    objList[i].enabled = true;
    objList[i].title = encodeURI(data[i].title || 'Kein Titel');
    
    objList[i].modified = data[i].modified;
    objList[i].relation_id = parseInt(data[i].relation_id, 10);
    objList[i].relation_type = parseInt(data[i].relation_type, 10);

    switch(type) {
      case 'Poi':
        hasStrongConnection = true;

        objList[i].short_text = encodeURI(data[i].short_text || '');
        objList[i].altitude = 0.0;
        objList[i].latitude = parseFloat(data[i].latitude);
        objList[i].longitude = parseFloat(data[i].longitude);

        objList[i].icon_file = "";
        if("icon" in data[i]) {
          if("file" in data[i].icon) {
            objList[i].icon_file = data[i].icon.file;
            FileHandler.data.downloadQueue.push([data[i].icon.file, data[i].icon.size]);
          }
        }
        break;

      case 'PoiContent':
        objList[i].text = encodeURI(data[i].text || '');
        objList[i].add_on_type = parseInt(data[i].add_on_type, 10);
        objList[i].language = data[i].Metadata.language;

        objList[i].media_file = "";
        objList[i].media_mimetype = "image/png";
        if("media" in data[i]) {
          if("mimetype" in data[i].media) {
            objList[i].media_mimetype = data[i].media.mimetype;
          }
          if("file" in data[i].media) {
            objList[i].media_file = data[i].media.file;
            if(hasStrongConnection) {
              FileHandler.data.downloadQueue.push([data[i].media.file, data[i].media.size]);
            }
          }
        }
        break;

      case 'PoiRecognition':
        objList[i].add_on_type = parseInt(data[i].add_on_type, 10);
        objList[i].text = encodeURI(data[i].text || '');
        objList[i].tracking_id = data[i].tracking_id || '';
        objList[i].display_type = data[i].display_type == "0"? false:true;
        objList[i].overlay_type = data[i].overlay_type == "0"? false:true;
        objList[i].scaling_x = parseFloat(data[i].scaling_x);
        objList[i].scaling_y = parseFloat(data[i].scaling_y);
        objList[i].scaling_z = parseFloat(data[i].scaling_z);
        objList[i].rotation_x = parseFloat(data[i].rotation_x);
        objList[i].rotation_y = parseFloat(data[i].rotation_y);
        objList[i].rotation_z = parseFloat(data[i].rotation_z);
        objList[i].translation_x = parseFloat(data[i].translation_x);
        objList[i].translation_y = parseFloat(data[i].translation_y);
        objList[i].translation_z = parseFloat(data[i].translation_z);

        objList[i].overlay_file = "";
        objList[i].overlay_mimetype = "image/png";
        if("overlay" in data[i]) {
          if("mimetype" in data[i].overlay) {
            objList[i].overlay_mimetype = data[i].overlay.mimetype;
          }
          if("file" in data[i].overlay) {
            objList[i].overlay_file = data[i].overlay.file;
            if(hasStrongConnection) {
              FileHandler.data.downloadQueue.push([data[i].overlay.file, data[i].overlay.size]);
            }
          }
        }

        objList[i].wt3_file = "";
        if("wt3" in data[i]) {
          if("file" in data[i].wt3) {
            objList[i].wt3_file = data[i].wt3.file;
            if(hasStrongConnection) {
              FileHandler.data.downloadQueue.push([data[i].wt3.file, data[i].wt3.size]);
            }
          }
        }

        objList[i].media_file = "";
        objList[i].media_mimetype = "image/png";
        if("media" in data[i]) {
          if("mimetype" in data[i].media) {
            objList[i].media_mimetype = data[i].media.mimetype;
          }
          if("file" in data[i].media) {
            objList[i].media_file = data[i].media.file;
            if(hasStrongConnection) {
              FileHandler.data.downloadQueue.push([data[i].media.file, data[i].media.size]);
            }
          }
        }
        break;
    }

    if(hasStrongConnection) {
      FileHandler.data.bytesTotal += parseInt(data[i].numberOfBytes, 10);
    }
  }
}
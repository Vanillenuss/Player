function loadTourData() {
  var url = app.cons.SERVER_URL + app.cons.TOURDATE_URL + "lat=" + localStorage.getItem('lat') + "&lng=" + localStorage.getItem('lon') + "&distance=" + app.cons.DISTANCE;

  // try to load nearest tourdates from InfoGrid server
  $.ajax({
    url: url,
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

    if(data.length > 0) {

      var tourdatesFromServer = [];
      var tourdatesFromServerIDList = [];

      for (var i = 0; i < data.length; i++) {
        tourdatesFromServer[i] = {};
        $.extend(tourdatesFromServer[i], data[i]);

        tourdatesFromServerIDList.push(parseInt(tourdatesFromServer[i].id));

        tourdatesFromServer[i].icon_file = "";
        if ("icon" in data[i]){
          if ("file" in data[i].icon){
            tourdatesFromServer[i].icon_file = data[i].icon.file;
            delete tourdatesFromServer[i].icon;
            FileHandler.data.downloadQueue.push([data[i].icon.file, data[i].icon.size]);
          }
        }
        
        tourdatesFromServer[i].wtc_file = ""
        if ("wtc" in data[i]){
          if ("file" in data[i].wtc){
            tourdatesFromServer[i].wtc_file = data[i].wtc.file;
            delete tourdatesFromServer[i].wtc;
            FileHandler.data.downloadQueue.push([data[i].wtc.file, data[i].wtc.size]);
          }
        }

        delete tourdatesFromServer[i].numberOfBytes;
        FileHandler.data.bytesTotal += parseInt(data[i].numberOfBytes, 10);
      }
      
      checkForAvailableStoriesAndActiveSessions(tourdatesFromServerIDList);
      FileHandler.downloadFiles();
      
      // store the newest tourdates in localStorage (although WebSQL is much better, it can't be used due to Wikitude causing an SECURITY_ERR)
      try{
        var tourdatesFromLocalDBIDList = [];

        var WEB_DB = new $IGDB.Context({provider: 'LocalStore', databaseName: 'WEB_DB'});
        WEB_DB.onReady(function(){

          // go through all existing tourdates in local db
          WEB_DB.Tourdates.forEach(function (item) {

            // if tourdate was modified or is not present in the list of new tourdates from the server delete it from local db
            var idx = tourdatesFromServerIDList.indexOf(parseInt(item.id));
            var modified = (idx == -1) || (item.modified < tourdatesFromServer[idx].modified);
            if(modified) {
              WEB_DB.Tourdates.remove(item);
              if(item.wtc_file != "") FileHandler.removeFile(item.wtc_file);
              if(item.icon_file != "") FileHandler.removeFile(item.icon_file);
            } else {
              tourdatesFromLocalDBIDList.push(parseInt(item.id));
            }
          }).done(function(){
            WEB_DB.saveChanges().then(function(){

              // go through all new tourdates from server
              for (var i = 0; i < tourdatesFromServer.length; i++) {

                // if tourdate is not present in local db yet add it
                var idx = tourdatesFromLocalDBIDList.indexOf(parseInt(tourdatesFromServer[i].id));
                if(idx == -1) {
                  WEB_DB.Tourdates.add(tourdatesFromServer[i]);
                }
              }
              WEB_DB.saveChanges();
            });
          });
        });
      } catch(e) {
        $('div.alert').show();
        setContentVisibility(true);
        setHeaderControlsVisibility(true);
      }

      // load tourlist only when all downloads have finished
      FileHandler.data.downloadTimer = setInterval(function() {
        if(FileHandler.data.downloadQueue.length <= 0 && FileHandler.data.bytesReceived == FileHandler.data.bytesTotal) {
          setDownloadProgressVisibility(false);
          clearInterval(FileHandler.data.downloadTimer);
          FileHandler.data.bytesTotal = 0;
          FileHandler.data.bytesReceived = 0;
          FileHandler.updateDownloadProgressValue();

          setTimeout(function(){
            renderTourDataList(tourdatesFromServer);
          }, FileHandler.data.waitForResponse * 2);
        } else {
          FileHandler.updateDownloadProgressValue();
        }
      }, FileHandler.data.waitForResponse);

    } else {
      $('div.alert').show();
      setContentVisibility(true);
      setHeaderControlsVisibility(true);
    }
  }).fail(function(jqXHR, textStatus) {
      console.log("Tourdata request failed: " + textStatus);

    // if forbidden go to start screen
    if(jqXHR.status == 403) logout(false);
    else {
      // when there is no internet connection restore the latest tourdates from localStorage
      try {
        var WEB_DB = new $IGDB.Context({provider: 'LocalStore', databaseName: 'WEB_DB'});
        WEB_DB.onReady(function(){

          WEB_DB.Tourdates.toArray().done(function(tourdatesFromLocalDB) {
            if(tourdatesFromLocalDB.length > 0) {
              renderTourDataList(tourdatesFromLocalDB);
            } else {
              $('div.alert').show();
              setContentVisibility(true);
              setHeaderControlsVisibility(true);
            }
          });
        });
      } catch(e) {
        $('div.alert').show();
        setContentVisibility(true);
        setHeaderControlsVisibility(true);
      }
    }
  });
}

function renderTourDataList(data) {
  $('div.alert').hide();
  setContentVisibility(true);
  setHeaderControlsVisibility(true);
  var source = $("#tourdates_as_list").html();
  var template = Handlebars.compile(source);
  for (var i = 0; i < data.length; i++) {
    var access_anywhere = data[i].access_anywhere;
    var distance = 0.0;
    if(!access_anywhere) {
      distance = calculateDistance(Number(data[i].latitude), Number(data[i].longitude));
      distance = ((distance > 9.9)? "> 9.9" : distance.toFixed(2));
    }

    var tourID = data[i].id || '0';
    var wtcFile = data[i].wtc_file || '';
    var hasWtcFile = data[i].wtc_file !== "";
    var localIconURL = (data[i].icon_file == "")? "img/no-image.png" : FileHandler.data.localPath + data[i].icon_file;
    var serverIconURL = app.cons.SERVER_URL + data[i].icon_file;
    var tourtitle = data[i].title || 'Kein Titel';
    var ir_label = localStorage.getItem('_language') == 'en'? 'Image recognition':'Bilderkennung';
    var nr_label = localStorage.getItem('_language') == 'en'? 'Narration':'Narration';
    var d_label = localStorage.getItem('_language') == 'en'? 'Distance':'Entfernung';

    var context = {
      tourID: tourID,
      wtcFile: wtcFile,
      hasWtcFile: hasWtcFile,
      localIconURL: localIconURL,
      serverIconURL: serverIconURL,
      tourtitle: tourtitle,
      distance: distance,
      ir_label: ir_label,
      nr_label: nr_label,
      d_label: d_label,
      access_anywhere: access_anywhere
    };

    $('div#tourlist').append(template(context));
  }

  renderNarrationLabel();
  $(function () {
    $('[data-toggle="tooltip"]').tooltip();
  });
}

function showTourDescription(tourID) {
  try {
    var WEB_DB = new $IGDB.Context({provider: 'LocalStore', databaseName: 'WEB_DB'});
    WEB_DB.onReady(function(){
      WEB_DB.Tourdates.single(
        function( tour ) {
          return tour.id == this.id
        }, {id: tourID},
        function( tour ) {
          $('#tourDescriptionModal .modal-body').text(tour.description);
          $('#tourDescriptionModal').modal('show');
        }
      );
    });
  } catch(e) {
    $('#tourDescriptionModal').modal('hide');
  }
}

function renderNarrationLabel() {
  $('.tour').each(function(index) {
    var id = $(this).data('id');
    if(app.data.availableStories[id]) {
      $(this).find('.right span.book').show();
    }
  });
}

function tourlistItemOnClick(item) {
  var item = $(item);
  var id = item.data("id");
  var wtc_file = item.data("wtc");
  var access_anywhere = item.data("aa");

  app.data.currentTour = {
    id: id,
    wtc_file: wtc_file,
    access_anywhere: access_anywhere
  };

  if(app.data.activeStorySessions[id]) {
    showPageToContinueNarration();
  } else {
    if(app.data.availableStories[id]) {
      showPageToActivateNarration();
    } else {
      app.data.selectedNarration = -1;
      app.data.selectedSession = -1;
      loadPOIData();
        
    }
  }
}

function showPageToContinueNarration() {
  var body = 'Es wurde eine aktive Narration gefunden? Möchtes Du diese fortsetzen?';
  var lblContinue = 'fortsetzen';
  var lblDelete = 'löschen';
  switch(localStorage.getItem('_language')) {
    case 'en':
      body = 'There was an active narration found. Do you wish to go one with it?';
      lblContinue = 'continue';
      lblDelete = 'delete';
      break;
  }
  $('#availableStoriesModal .modal-body').html(body);
  $('#availableStoriesModal .modal-footer').show();
  $('#availableStoriesModal .modal-footer button').hide();
  $('#availableStoriesModal .modal-footer .nr-continue').show().text(lblContinue);
  $('#availableStoriesModal .modal-footer .nr-delete').show().text(lblDelete);
  $('#availableStoriesModal').modal('show');
}

function showPageToActivateNarration() {
  var body = 'Diese Tour kann narrativ gesteuert werden. Wähle <em>aktivieren</em>, um eine personalisierte Tour zu starten.';
  var next = 'weiter';
  var activate = 'aktivieren';
  switch(localStorage.getItem('_language')) {
    case 'en':
      body = 'This tour can be narratively controlled. Choose <em>activate</em> to start a personalized tour.';
      next = 'next';
      activate = 'activate';
      break;
  }
  $('#availableStoriesModal .modal-body').html(body);
  $('#availableStoriesModal .modal-footer').show();
  $('#availableStoriesModal .modal-footer button').hide();
  $('#availableStoriesModal .modal-footer .nr-next').show().text(next);
  $('#availableStoriesModal .modal-footer .nr-activate').show().text(activate);
  $('#availableStoriesModal').modal('show');
}

function continueActiveSession() {
  $('#availableStoriesModal').modal('hide');
  var tourID = app.data.currentTour.id;
  var activeSession = app.data.activeStorySessions[tourID][0];
  app.data.selectedNarration = activeSession.story_id;
  app.data.selectedSession = activeSession.id;
  app.data.nextState = activeSession.next[0];
  loadPOIData();
}

function deleteActiveSession() {
  $('#availableStoriesModal').modal('hide');
  var tourID = app.data.currentTour.id;
  var activeSession = app.data.activeStorySessions[tourID][0];

  var requestUrl = app.cons.SERVER_URL + 'NarratorBridge/deleteStorySession.json';
  $.ajax({
    url: requestUrl,
    dataType: 'json',
    xhrFields: {
      withCredentials: true
    },
    type: 'DELETE',
    crossDomain: true,
    data: activeSession,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('pragma', 'no-cache');
      xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
  }).done(function(result) {
    console.log("deleted active session");
    delete app.data.activeStorySessions[tourID];
    showPageToActivateNarration();
  }).fail(function(jqXHR, textStatus) {
    console.log("Request failed: " + textStatus);
    loadPOIData();
  });
  app.data.selectedNarration = -1;
  app.data.selectedSession = -1;
}

function startTour(withNarration) {
  $('#availableStoriesModal').modal('hide');

  if(withNarration) {
    var priorities = {
      tags: $('.labelSelect').data()? $('.labelSelect').data().labelSelect.getAllSelected() : [],
      gender: $('.selectpicker.prio_gender').val(),
      age: $('.selectpicker.prio_age').val(),
      language: localStorage.getItem('_language')
    }
    registerNarration(priorities);
  } else {
    app.data.selectedNarration = -1;
    app.data.selectedSession = -1;
    loadPOIData();
  }
}

function registerNarration(priorities) {
  var data = {
    ref_project_id: app.data.currentTour.id,
    UUID: localStorage.getItem('UUID'),
    priorities: priorities,
    time: Date.now(),
    currentLocation: {
      latitude: localStorage.getItem('lat'),
      longitude: localStorage.getItem('lon')
    },
    app_ref: 1,
    story_id: app.data.selectedNarration
  };

  var requestUrl = app.cons.SERVER_URL + 'NarratorBridge/createStorySession.json';
  $.ajax({
    url: requestUrl,
    dataType: 'json',
    xhrFields: {
      withCredentials: true
    },
    type: 'POST',
    crossDomain: true,
    data: data,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('pragma', 'no-cache');
      xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
  }).done(function(result) {
    if(result && result['next']) {
      app.data.nextState = result['next'][0];
      app.data.selectedSession = result['session_id'];
      loadPOIData();
    }
  }).fail(function(jqXHR, textStatus) {
    app.data.selectedNarration = -1;
    app.data.selectedSession = -1;
    loadPOIData();
  });
}

function startNarration(narrationIndex) {
  var id = app.data.currentTour.id;
  var nrs = app.data.availableStories[id][narrationIndex];
  var priorities = JSON.parse(nrs.priorities_to_request) || {};
  app.data.selectedNarration = nrs.id;
  
  $('#availableStoriesModal .modal-body').hide();
  var body = '';

  if(priorities.intro_text) {
    body += '<p>'+ priorities.intro_text + '</p>';
  }

  if(priorities.tags && priorities.tags.selectable) {
    if(priorities.tags.question) body += priorities.tags.question;
    else body += 'Wähle die Themen aus, die Dich besonders interessieren.';
    body += '<br><div class="labelSelect"></div>';
  }

  if(priorities.gender) {
    body += '<div style="margin-top: 5px;">Wähle dein Geschlecht.</div>';
    body += ''+
      '<select class="selectpicker prio_gender" data-width="auto">'+
        '<option value="0">keine Angabe</option>'+
        '<option value="1">Ich bin männlich</option>'+
        '<option value="2">Ich bin weiblich</option>'+
      '</select>';
  }

  if(priorities.age) {
    body += '<div style="margin-top: 5px;">Wähle dein Alter.</div>';
    body += ''+
      '<select class="selectpicker prio_age" data-width="auto">'+
        '<option value="0">&lt;&nbsp;12</option>'+
        '<option value="1">12+</option>'+
        '<option value="2">16+</option>'+
        '<option value="3">18+</option>'+
      '</select>';
  }

  $('#availableStoriesModal .modal-body').html(body);

  if(priorities.tags && priorities.tags.selectable) {
    var labelSelect = $('.labelSelect').labelSelect({
      tabElements: priorities.tags.selectable
    });
  }

  $('#availableStoriesModal .selectpicker').selectpicker({style: 'btn-default btn-xs'});
  $('#availableStoriesModal .modal-footer button').hide();
  $('#availableStoriesModal .modal-footer .nr-start').fadeIn();
  $('#availableStoriesModal .modal-body').fadeIn();
}


function showAvailableStories() {
  var nrs = app.data.availableStories[app.data.currentTour.id];
  if(nrs.length == 1) startNarration(0);
  else {
    $('#availableStoriesModal .modal-footer').fadeOut();
    $('#availableStoriesModal .modal-body').hide();

    var body = 'Es sind mehrere Narrationen verfügbar. Wähle eine aus.';
    switch(localStorage.getItem('_language')) {
      case 'en':
        body = 'There are several narrations available. Choose one.';
        break;
    }

    body += '<br><br><ul class="list-group"></ul>';

    $('#availableStoriesModal .modal-body').html(body);

    var list = '';
    for(var i in nrs) {
      list += '<li onclick="startNarration('+ i +');" class="list-group-item" style="cursor: pointer;">'+ nrs[i].name +'</li>';
    }

    $('#availableStoriesModal ul.list-group').html(list);
    $('#availableStoriesModal .modal-body').fadeIn();
  }
}
  
function checkForAvailableStoriesAndActiveSessions(tourIDList) {
  var data = {
    ref_project_ids: JSON.stringify(tourIDList),
    UUID: localStorage.getItem('UUID'),
    time: Date.now()
  };

  var requestUrl = app.cons.SERVER_URL + 'NarratorBridge/checkForAvailableStoriesAndActiveSessions.json';
  $.ajax({
    url: requestUrl,
    dataType: 'json',
    xhrFields: {
      withCredentials: true
    },
    type: 'POST',
    crossDomain: true,
    data: data,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('pragma', 'no-cache');
      xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
  }).done(function(result) {
    if(result != null) {
      app.data.availableStories = [];
      app.data.activeStorySessions = [];
      for(var i in result) {
        var tourID = result[i]['Story'].ref_project_id;
        if(!app.data.availableStories[tourID]) {
          app.data.availableStories[tourID] = [];
        }
        app.data.availableStories[tourID].push(result[i]['Story']);

        if(result[i]['StorySession'].length > 0) {
          if(!app.data.activeStorySessions[tourID]) {
            app.data.activeStorySessions[tourID] = [];
          }
          for(var j in result[i]['StorySession']) {
            app.data.activeStorySessions[tourID].push(result[i]['StorySession'][j]);
          }
        }
      }
      renderNarrationLabel();
    }
  }).fail(function(jqXHR, textStatus) {
    console.log("Request failed: " + textStatus);
  });
}
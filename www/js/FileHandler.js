var FileHandler = {

  defaults: {
    fileSystem: null,
    fsIsInit: false,
    localPath: '',

    waitForResponse: 250,
    downloadTimer: null,
    bytesReceived: 0,
    bytesTotal: 0,
    downloadQueue: [],
  },

  data: null,


  init: function() {
    this.data = $.extend({}, this.defaults);
  },
  
  initializeFileSystem: function(callback) {
    if(FileHandler.data.fsIsInit) {
      return;
    }

    // Note: The file system has been prefixed as of Google Chrome 12:
    window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    window.requestFileSystem(
      LocalFileSystem.TEMPORARY,
      0,
      function(fileSystem) {
        FileHandler.data.fileSystem = fileSystem;
        FileHandler.data.localPath = fileSystem.root.toURL() + 'InfoGrid/';

        /*
        if(FileHandler.data.localPath.length > 8 && FileHandler.data.localPath.substring(0, 7) == 'file://') {
          FileHandler.data.localPath = FileHandler.data.localPath.substr(7);
        }
        */

        FileHandler.data.fsIsInit = true;

        if(isFunction(callback)) {
          callback();
        }
      },
      function(e) {
        FileHandler.errorHandler(e);

        FileHandler.fsIsInit = false;
        FileHandler.data.bytesTotal = 0;
        FileHandler.data.downloadQueue = [];
        //FileHandler.data.localPath = app.cons.SERVER_URL;
        
        if(isFunction(callback)) {
          callback();
        }
      }
    );
  },

  errorHandler: function(e) {
    var msg = '';
    switch (e.code) {
      case FileError.NOT_FOUND_ERR:
        msg = 'NOT_FOUND_ERR: A required file or directory could not be found at the time an operation was processed.';
        break;
      case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR: A required file was unsafe for access within a Web application OR too many calls are being made on filesystem resources.';
        break;
      case FileError.ABORT_ERR:
        msg = 'ABORT_ERR';
        break;
      case FileError.NOT_READABLE_ERR:
        msg = 'NOT_READABLE_ERR: A required file or directory could be read.';
        break;
      case FileError.ENCODING_ERR:
        msg = 'ENCODING_ERR: A path or URL supplied to the API was malformed.';
        break;
      case FileError.NO_MODIFICATION_ALLOWED_ERR:
        msg = 'NO_MODIFICATION_ALLOWED_ERR: The user attempted to write to a file or directory which could not be modified due to the state of the underlying filesystem.';
        break;
      case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR: An operation depended on state cached in an interface object, but that state that has changed since it was read from disk.';
        break;
      case FileError.SYNTAX_ERR:
        msg = 'SYNTAX_ERR';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR: The modification requested was illegal. Examples of invalid modifications include moving a directory into its own child, moving a file into its parent directory without changing its name, or copying a directory to a path occupied by a file.';
        break;
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'QUOTA_EXCEEDED_ERR: The operation failed because it would cause the application to exceed its storage quota.';
        break;
      case FileError.TYPE_MISMATCH_ERR:
        msg = 'TYPE_MISMATCH_ERR: The user has attempted to look up a file or directory, but the Entry found is of the wrong type [e.g. is a DirectoryEntry when the user requested a FileEntry].';
        break;
      case FileError.PATH_EXISTS_ERR:
        msg = 'PATH_EXISTS_ERR: The user agent failed to create a file or directory due to the existence of a file or directory with the same path.';
        break;
      default:
        msg = 'Unknown Error';
        break;
    };
    console.log('fileSystem error: '+ msg);
  },

  fileTransferErrorHandler: function(e) {
    var msg = '';
    switch(e.code) {
      case FileTransferError.FILE_NOT_FOUND_ERR:
        msg = 'Download failed: File not found.';
        break;
      case FileTransferError.INVALID_URL_ERR:
        msg = 'Download failed: Invalid URL.';
        break;
      case FileTransferError.CONNECTION_ERR:
        msg = 'Download failed: Broken connection.';
        break;
      case FileTransferError.ABORT_ERR:
        msg = 'Download failed: Aborted.';
        break;
      case FileTransferError.NOT_MODIFIED_ERR:
        msg = 'Download failed: Not modified.';
        break;
      default:
        msg = 'Unknown Error';
      break;
    }
    console.log(msg);
  },

  checkIfFileExists: function(path) {
    var req = null;

    try {
      req = jQuery.ajax({
        url: path,
        type: 'HEAD',
        async: false
      });
    } catch (e) {
      console.log(e);
    }

    return (req.status == "200" && req.responseText != "") ? true : false;
  },

  getFileSystem: function() {
    return FileHandler.data.fileSystem;
  },

  // downloads file from URL and stores it in path (a subdirectory of /InfoGrid/)
  downloadFiles: function() {

    if(FileHandler.getFileSystem() != null) {
      if(FileHandler.data.downloadQueue.length > 0 && FileHandler.data.bytesReceived != FileHandler.data.bytesTotal) {
        var filePath = FileHandler.data.downloadQueue[0][0];
        var localPath = FileHandler.data.localPath;

        if(localPath.length > 8 && localPath.substring(0, 7) == 'file://') {
          localPath = localPath.substr(7);
        }
      
        // first check if file already exists
        FileHandler.getFileSystem().root.getFile(localPath + filePath, {}, 
        function(f) {
          f.getMetadata(function(metadata) {
            FileHandler.data.bytesReceived += metadata.size;
          });
          console.log('file already exists ' + f.name);
          FileHandler.data.downloadQueue.shift();
          if(FileHandler.data.downloadQueue.length > 0) FileHandler.downloadFiles();
        }, 
        function(e) {
          console.log('file does not exist');
          setDownloadProgressVisibility(true);
          
          var fileTransfer = new FileTransfer();
          
          var bytesLoaded = 0;
          fileTransfer.onprogress = function(progressEvent){
            if(progressEvent.lengthComputable) {
              var diff = progressEvent.loaded - bytesLoaded;
              bytesLoaded = progressEvent.loaded;
              FileHandler.data.bytesReceived += diff;
            }
          };

          fileTransfer.download(
            app.cons.SERVER_URL + filePath,
            localPath + filePath,
            function(file) {
              console.log('download complete: ' + file.toURL());
              FileHandler.data.downloadQueue.shift();
              FileHandler.downloadFiles();
            },
            function(e) {
              FileHandler.fileTransferErrorHandler(e);

              console.log('bytes to ignore ' + FileHandler.data.downloadQueue[0][1]);
              FileHandler.data.bytesReceived += FileHandler.data.downloadQueue[0][1];
              FileHandler.data.downloadQueue.shift();
              FileHandler.downloadFiles();
            }
          );
        });
      }
    } else {
      console.log('fileSystem is null');
      //FileHandler.initializeFileSystem(FileHandler.downloadFiles);
      FileHandler.data.bytesTotal = 0;
      FileHandler.data.downloadQueue = [];
      //FileHandler.data.localPath = app.cons.SERVER_URL;
    }
  },

  updateDownloadProgressValue: function() {
    var progress = 0;
    if(FileHandler.data.bytesTotal > 0) progress = parseInt(FileHandler.data.bytesReceived / FileHandler.data.bytesTotal * 100, 10);
    $('.download-progress .progress-bar').css('width', progress + '%').text(progress + '%');
  },

  // remove file from path (a subdirectory of /InfoGrid/)
  removeFile: function(path) {
    FileHandler.deleteEntry(
      path,
      function() {
        console.log('File removed.');
      },
      function(e) {
        console.log('File could not be removed');
        FileHandler.errorHandler(e);
      }
    );
  },

  // remove directory recursively from path (a subdirectory of  cache folder)
  removeFolder: function(path, callback) {
    FileHandler.deleteEntry(
      path,
      function() {
        console.log('Folder removed.');
        if(isFunction(callback)) {
          callback();
        }
      },
      function(e) {
        console.log('Folder could not be removed');
        FileHandler.errorHandler(e);
        if(isFunction(callback)) {
          callback();
        }
      }
    );
  },

  // HELPER FUNCTIONS
  // deletes specified file or directory
  deleteEntry: function (name, success, error) {
    // deletes entry, if it exists
    window.resolveLocalFileSystemURL(FileHandler.data.localPath + name, function (entry) {
        if (entry.isDirectory === true) {
            entry.removeRecursively(success, error);
        } else {
            entry.remove(success, error);
        }
    }, success);
  },
  
};
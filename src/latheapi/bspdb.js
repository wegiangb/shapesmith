define([
    'underscore',
    'backbone-events',
    'lathe/bsp',
  ],
  function(_, Events) {

    var DB = function(infoHandler, errorHandler) {

      _.extend(this, Events);
      var that = this;
      var db;

      var openDBRequest = indexedDB.open('shapesmith', 1);
      
      openDBRequest.onerror = function() {
        console.error('Could not create BSP database');
      };

      // Request success. Trigger initialized event if first success.
      var successCount = 0;
      openDBRequest.onsuccess = function(event) {
        if (!successCount) {
          that.trigger('initialized');
          infoHandler('BSP DB initialized');
          db = event.target.result;
        } 
        ++successCount;
      };

      // Will be called when the DB is created the first time or when
      // the version is older than the existing version
      openDBRequest.onupgradeneeded = function(event) {
        infoHandler('creating/upgrading BSP db');
        var db = event.target.result;
        db.createObjectStore('bsp.cache', { keyPath: 'sha' });
      };

      this.read = function(sha, callback) {
        var transaction = db.transaction(['bsp.cache'], 'readonly');

        transaction.onerror = function(event) {
          errorHandler('could not read bsp', event);
          callback(event);
        };

        var request = transaction.objectStore('bsp.cache').get(sha);

        request.onsuccess = function() {
          // console.log('read success:', request.result && request.result.sha);
          callback(undefined, request.result);
        };

      };

      this.write = function(value, callback) {
        var transaction = db.transaction(['bsp.cache'], 'readwrite');
        
        transaction.onerror = function(event) {
          errorHandler('could not write bsp', event);
          callback(event);
        };

        transaction.oncomplete = function() {
          // infoHandler('write transaction complete');
        };

        var readRequest = transaction.objectStore('bsp.cache').get(value.sha);

        readRequest.onsuccess = function() {
          if (readRequest.result) {
            callback();
          } else {

            // BSP is serialized manually otherwise the IndexDB shim fails
            // because JSON.stringify fails because of circular references 
            var writeRequest = transaction.objectStore('bsp.cache').add(value);

            writeRequest.onsuccess = function() {
              // infoHandler('write success', value.sha);
              callback();
            };

            writeRequest.onerror = function(event) {
              errorHandler('write request error', event);
            };

          }
        };

        readRequest.onerror = function(event) {
          errorHandler('read error during write', event);
        };
      };

    };

    return DB;

  });
(function (services, $) {
    "use strict";

    /**
     * PhotorankService Constructor.
     * @constructor
     * @param {String} authToken - Authentication key.
     */
    function PhotorankService (authToken) {
        if (!(this instanceof PhotorankService)) {
            return new PhotorankService(authToken);
        }

        if (!authToken) {
            throw new Error("Photorank authentication token not provided.");
        }

        this.authToken = authToken;
    }

    PhotorankService.prototype = {
        constructor: PhotorankService,

        /**
         * Gets recent media data.
         * @param {Number=} count - Number of items to be returned from Photorank.
         * @return {Promise} returns promise
         */
        getRecentMedia: function getRecentMedia(count) {
            var self = this,
                requestParams;

            if (!this.customer) {
                return _authenticate.call(this)
                    .then(function () {
                        return self.getRecentMedia(count);
                    });
            }
            
            requestParams = { count: count, auth_token: this.authToken };

            return _getPagedData(this.customer._embedded["media:recent"]._links.self.href, requestParams);
        },

        /**
         * Gets uploader information for a collection of media objects.
         * @param  {Array|Object} dataCollection - Array of media object or a single media object.
         * @return {Promise}
         */
        getMediaUploaderDetails: function getMediaUploaderDetails(dataCollection) {
            var dfd = $.Deferred(),
                self = this,
                collection = [],
                totalItems = dataCollection.length,
                itemsAdded = 0;

            if (!Array.isArray(dataCollection)) {
                dataCollection = [dataCollection];
            }

            // Loop through each element to get uploader .
            dataCollection.forEach(function (media, index) {

                // Request uploader information.
                $.get(media._embedded.uploader._links.self.href, { auth_token: self.authToken })
                    .then(function (uploader, links) {
                        _updateCollection(index, media, uploader.data);
                    });
            });

            return dfd.promise();

            /**
             * Updates collection array.
             * @private
             * @param  {Number} index - Original position.
             * @param  {Object} media - Media data object.
             * @param  {Object} uploader - Uploader data object.
             */
            function _updateCollection(index, media, uploader) {
                collection[index] = {
                    media: media,
                    uploader: uploader
                };

                itemsAdded++;

                if (itemsAdded === totalItems) {
                    dfd.resolve(collection);
                }
            }
        }
    }

    /**
     * Method used to get the initial customer settings.
     * NOTE: make sue the context of "this" is pointing to the 
     * instance of PhotorankService.
     * @return {Promise}
     */
    function _authenticate() {
        var self = this;

        return $.get("https://photorankapi-a.akamaihd.net", { auth_token: this.authToken })
            .then(function (response) {
                self.customer = response.data._embedded.customer;
            });
    }

    function _getPagedData(url, requestParams) {
        var dfd = $.Deferred();
        
        $.get(url, requestParams)
            .then(function (response) {
                var links = response.data._links,
                    getNext,
                    getPrevious,
                    getFirst;

                getNext = links.next ? _getPagedData.bind($, links.next.href, requestParams) : null;
                getPrevious = links.prev ? _getPagedData.bind($, links.prev.href, requestParams) : null;
                getFirst = links.first ? _getPagedData.bind($, links.first.href, requestParams) : null;

                dfd.resolve(response, getNext, getPrevious, getFirst);
            });

        return dfd.promise();   
    }

    services.PhotorankService = PhotorankService;

})(dfs.Services, jQuery);
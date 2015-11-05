(function (Apps, PhotorankService, $, Handlebars, moment) {
    "use strict";

    Handlebars.registerHelper("formatDate", function (dateString) {
        return moment(dateString).fromNow();
    });

    Apps.ConceptOne = (function () {
        function ConceptOne (config) {
            if (!(this instanceof ConceptOne)) {
                return new ConceptOne(config);
            }

            this.config = {
                authToken: config.authToken,
                dataService: PhotorankService(config.authToken),
                sequenceInterval: config.sequenceInterval || 250,
                itemsPerPage: config.itemsPerPage,
                pagePersistence: config.pagePersistence,
                numberOfPages: config.numberOfPages,
                intro: config.intro,
                outro: config.outro,
                introLength: config.introLength,
                outroLength: config.outroLength,
                elements: {
                    pages: {},
                    $target: config.target
                },
                templates: {
                    gallery: $("#concept-one-gallery-template").html(),
                    page: $("#concept-one-page-template").html(),
                    intro: $("#concept-one-intro-template").html(),
                    outro: $("#concept-one-outro-template").html()
                }
            };
            this._init();
        }

        ConceptOne.prototype = {
            constructor: ConceptOne,

            _init: function _init() {
                var self = this,
                    config = this.config,
                    service = config.dataService,
                    elements = config.elements,
                    numberOfPages = self.config.numberOfPages;
                
                // Compile Handlebars templates.
                compileTemplates(this.config.templates);

                self._renderHtml();

                // Run recursive funtion to get all pages.
                self._loadPages(numberOfPages, service.getRecentMedia.bind(service, this.config.itemsPerPage))
                    .then(function () {
                        return self.play();
                    });
            },

            /**
             * Renders basic HTML elements.
             */
            _renderHtml: function _renderHtml() {
                var self = this,
                    config = self.config,
                    elements = config.elements,
                    templates = config.templates,
                    $intro, $outro, $gallery;

                elements.$target.html("");

                $gallery = $(templates.gallery());
                $intro = $(templates.intro(config.intro));
                $outro = $(templates.outro(config.outro));
                
                elements.$intro = $intro;
                elements.$gallery = $gallery;
                elements.$outro = $outro;

                elements.$target.append($intro);
                elements.$target.append($gallery);
                elements.$target.append($outro);
            },

            /**
             * Loads images using PhotorankService
             * @param  {Number} pageCount - Number of pages to be loaded.
             * @param  {Function} loadPageMethod - Reference to a method to load data.
             * @param  {Promise=} promise - Required if you want recursive funcionality.
             * @return {Promise}
             */
            _loadPages: function _loadPages(pageCount, loadPageMethod, promise) {
                var dfd = promise ? promise : $.Deferred(),
                    self = this,
                    service = this.config.dataService,
                    numberOfPages = this.config.numberOfPages,
                    nextPage,
                    pageIndex = 0;

                loadPageMethod()
                    .then(function (response, next) {
                        nextPage = next;

                        return service.getMediaUploaderDetails(response.data._embedded);
                    })
                    .then(function (data) {
                        self._renderPages(numberOfPages - pageCount, data);

                        pageCount--;

                        if (pageCount && typeof nextPage === "function") {
                            self._loadPages(pageCount, nextPage, dfd);
                        }
                        else {
                            dfd.resolve();
                        }
                    });

                return dfd.promise();
            },

            /**
             * Renders gallery pages.
             * @param  {Number} index - Gallery page index.
             * @param  {Object} data - Data object.
             */
            _renderPages: function _renderPages(index, data) {
                var self = this,
                    elements = self.config.elements,
                    pageHTML = $(self.config.templates.page(data));

                elements.pages["page_" + index] = {
                    index: index,
                    page: pageHTML,
                    children: pageHTML.find(".media")
                };

                elements.$gallery.append(pageHTML);
            },

            play: function () {
                var self = this;

                self.showIntro()
                    .then(function () {
                        return self.showGalleryPages();
                    })
                    .then(function () {
                        return self.showOutro();
                    })
                    .then(function () {
                        self.play();
                    });
            },

            showIntro: function () {
                var config = this.config;

                return this.showSection(config.elements.$intro, config.introLength);
            },

            showOutro: function () {
                var config = this.config;

                return this.showSection(config.elements.$outro, config.outroLength);
            },

            showSection: function showSection($sectionElement, duration) {
                var dfd = $.Deferred(),
                    config = this.config;

                $sectionElement
                    .css("visibility", "visible")
                    .find("> div")
                    .addClass("section--in");

                window.setTimeout(function () {
                    $sectionElement
                        .find("> div")
                        .removeClass("section--in")
                        .addClass("section--out");

                    // Additional second delay to ensure 
                    // all transition are completed.
                    window.setTimeout(function () {
                        $sectionElement
                            .css("visibility", "hidden")
                            .find("> div")
                            .removeClass("section--out");

                        dfd.resolve();
                    }, 1000)
                }, duration);

                return dfd.promise();
            },

            showGalleryPages: function showGalleryPages(count, promise) {
                var self = this,
                    pages = self.config.elements.pages,
                    numberOfPages = self.config.numberOfPages,
                    dfd = promise || $.Deferred();

                count = count || 0;

                self.showGalleryPage(true, count)
                    .then(function () {
                        return self.showGalleryPage(false, count);
                    })
                    .then(function () {
                        count++;

                        if (count === numberOfPages) {
                            dfd.resolve();
                        }
                        else {
                            self.showGalleryPages(count, dfd);
                        }
                    });

                return dfd.promise();
            },

            showGalleryPage: function showGalleryPage(show, pageIndex) {
                var dfd = $.Deferred(),
                    self = this,
                    elements = this.config.elements.pages["page_" + pageIndex],
                    $parent = elements.page,
                    $children = elements.children,
                    childrenCount = $children.length,
                    HIDE_DELAY = 1000;

                if (show) {
                    $parent.css("visibility", "visible")
                }

                $children.each(function (index, element) {
                    window.setTimeout((function () {
                        $(this)
                            .toggleClass("media--in", show)
                            .toggleClass("media--out", !show);
                        
                        childrenCount--;

                        if (!childrenCount) {
                            // Add some delay to ensure all transitions
                            // are completed 
                            window.setTimeout(function () { 
                                if (!show) {
                                    $parent.css("visibility", "hidden")
                                    $children.removeClass("media--out");
                                }

                                dfd.resolve();
                            }, show ? self.config.pagePersistence : HIDE_DELAY);
                        }
                    }).bind(element), index * self.config.sequenceInterval);
                });

                return dfd.promise();
            }
        };

        function compileTemplates(templates) {
            for (var key in templates) {
                if ({}.hasOwnProperty.call(templates, key)) {
                    templates[key] = Handlebars.compile(templates[key]);
                }
            }
        }

        return ConceptOne;
    })();

    $(function () {
        var isSettingsMode = /#settings/.test(window.location.href),
            elements;

        elements = {
            settings: $("#settings"),
            toggler: $("#settings-toggler"),
            submit: $("#apply-settings"),
            introDisplayTimeout: $("#intro-display-timeout"),
            introTitle: $("#intro-title"),
            imagesPerPage: $("#images-per-page"),
            numberOfPages: $("#number-of-pages"),
            imagesTimeout: $("#images-display-timeout"),
            imagesDelay: $("#images-delay"),
            outroTimeout: $("#outro-display-timeout"),
            outroTitle: $("#outro-title"),
            outroText: $("#outro-text")
        };

        if (isSettingsMode) {
            initEvents();
        }


        function initEvents() {
            elements.settings.show();

            elements.toggler.on("click", function (e) {
                e.preventDefault();

                elements.settings.toggleClass("settings--opened");
            });

            elements.submit.on("click", function () {
                updateAnimation();

                elements.toggler.trigger("click");
            });
        }

        function updateAnimation() {

            Apps.ConceptOne({
                target: $("#concept-one"), 
                authToken: "f7f217fadcb8dad0bab9395c689114b74d48dbb84aa6fba32c1aa71c0a95f5e1",
                itemsPerPage: parseInt(elements.imagesPerPage.val(), 10),
                pagePersistence: parseInt(elements.imagesTimeout.val(), 10),
                introLength: parseInt(elements.introDisplayTimeout.val(), 10),
                outroLength: parseInt(elements.outroTimeout.val(), 10),
                sequenceInterval: parseInt(elements.imagesDelay.val(), 10),
                numberOfPages: parseInt(elements.numberOfPages.val(), 10),
                intro: {
                    title: elements.introTitle.val()
                },
                outro: {
                    title: elements.outroTitle.val(),
                    content: elements.outroText.val()
                }
            });
        }
    })

})(dfs.Apps, dfs.Services.PhotorankService, jQuery, Handlebars, moment);
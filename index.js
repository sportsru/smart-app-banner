define([], function () {
    'use strict';

    function extend() {
        var result = arguments[0];
        for(var i = 1; i<arguments.length; i++) {
            for (var key in arguments[i]) {
                result[key] = arguments[i][key];
            }
        }
        return result;
    }

    var storage = {
        get: function (key) {
            if ((window.localStorage[key] === 'false' || window.localStorage[key] === undefined) || window.localStorage[key] < new Date().getTime()) {
                window.localStorage[key] = false;
                return false;
            }

            return true;
        },
        set: function (key, value) {
            window.localStorage[key] = value;
        }
    };

    var userAgent = function (ua) {

        var result = {};
        if ((/(iPhone|iPad|iPod)/gi).test(ua)) {
            result.os = 'ios';
        }
        if (ua.indexOf('Android') > 0) {
            result.os = 'android';
        }
        if (ua.indexOf('like Gecko) Version/') >= 0) {
            result.isSafari = true;
        }
        return result;
    };

// IE < 11 doesn't support navigator language property.
    /* global navigator */
    var root = window.document.body;
// platform dependent functionality
    var mixins = {
        ios: {
            appMeta: 'apple-itunes-app',
            iconRels: ['apple-touch-icon-precomposed', 'apple-touch-icon'],
            getStoreLink: function () {
                return 'https://itunes.apple.com/' + this.options.appStoreLanguage + '/app/id' + this.appId;
            }
        },
        android: {
            appMeta: 'google-play-app',
            iconRels: ['android-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
            getStoreLink: function () {
                return 'http://play.google.com/store/apps/details?id=' + this.appId + this.options.googleUtm;
            }
        }
    };

    var SmartBanner = function (options) {
        var agent = userAgent(navigator.userAgent);

        this.options = extend({}, {
            daysHidden: 15,
            daysReminder: 90,
            appStoreLanguage: 'ru', // Language code for App Store
            button: 'OPEN', // Text for the install button
            store: {
                ios: 'On the App Store',
                android: 'In Google Play',
                windows: 'In the Windows Store'
            },
            theme: '', // put platform type ('ios', 'android', etc.) here to force single theme on all device
            icon: '', // full path to icon image if not using website icon image
            force: '' // put platform type ('ios', 'android', etc.) here for emulation
        }, options || {});

        if (this.options.force) {
            this.type = this.options.force;
        } else {
            this.type = agent.os;
        }

        extend(this, mixins[this.type]);

        if (!this.parseAppId()) {
            return;
        }

        // Don't show banner on ANY of the following conditions:
        // - device os is not supported,
        // - user is on mobile safari for ios 6 or greater (iOS >= 6 has native support for SmartAppBanner)
        // - running on standalone mode
        // - user dismissed banner
        var unsupported = !this.type;
        var isMobileSafari = (this.type === 'ios' && agent.isSafari);
        var runningStandAlone = navigator.standalone;
        var userDismissed = storage.get('smartbanner-closed:' + this.appId);
        var userInstalled = storage.get('smartbanner-installed:' + this.appId);

        if (unsupported || isMobileSafari || runningStandAlone || userDismissed || userInstalled) {
            return;
        }



        this.create();
        this.show();
    };

    SmartBanner.prototype = {
        constructor: SmartBanner,

        create: function () {
            var link = this.getStoreLink();
            var icon;

            if (this.options.icon) {
                icon = this.options.icon;
            } else {
                for (var i = 0; i < this.iconRels.length; i++) {
                    var rel = document.querySelector('link[rel="' + this.iconRels[i] + '"]');

                    if (rel) {
                        icon = rel.getAttribute('href');
                        break;
                    }
                }
            }

            var sb = document.createElement('div');
            var theme = this.options.theme || this.type;

            sb.className = 'smartbanner smartbanner-' + theme;
            sb.innerHTML = '<div class="smartbanner-container">' +
            '<a href="javascript:void(0);" class="smartbanner-close">&times;</a>' +
            '<span class="smartbanner-icon" style="background-image: url(' + icon + ')"></span>' +
            '<div class="smartbanner-info">' +
            '<div class="smartbanner-title"><span class="smartbanner-title-inner">' + this.options.title + '</span></div>' +
            '<div>' + this.options.author + '</div>' +
            '</div>' +
            '<a href="' + link + '" class="smartbanner-button">' +
            '<span class="smartbanner-button-text">' + this.options.button + '</span>' +
            '</a>' +
            '</div>';

            if (document.body) {
                document.body.appendChild(sb);
            } else {
                window.addEventListener('DOMContentLoaded', function () {
                    document.body.appendChild(sb);
                });
            }

            document.querySelector('.smartbanner-button', sb).addEventListener('click', this.install.bind(this), false);
            document.querySelector('.smartbanner-close', sb).addEventListener('click', this.close.bind(this), false);
        },
        hide: function () {
            root.classList.remove('smartbanner-show');
        },
        show: function () {
            root.classList.add('smartbanner-show');
            this.options.onShow && this.options.onShow(this.appId);
        },
        close: function () {
            this.hide();
            storage.set('smartbanner-closed:' + this.appId, (new Date(Date.now() +  (this.options.daysHidden * 1000 * 60 * 60 * 24))).getTime());
            this.options.onClose && this.options.onClose(this.appId);
        },
        install: function () {
            this.hide();
            storage.set('smartbanner-installed:' + this.appId, (new Date(Date.now() +  (this.options.daysReminder * 1000 * 60 * 60 * 24))).getTime());
            this.options.onInstall && this.options.onInstall(this.appId);
        },
        parseAppId: function () {
            var meta = document.querySelector('meta[name="' + this.appMeta + '"]');
            if (!meta) {
                return;
            }

            if (this.type === 'windows') {
                this.appId = meta.getAttribute('content');
            } else {
                this.appId = /app-id=([^\s,]+)/.exec(meta.getAttribute('content'))[1];
            }

            return this.appId;
        }
    };

    return SmartBanner;
});

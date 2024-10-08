/*
 * View model for OctoPrint-AutoLoginConfig
 *
 * Author: Charlie Powell
 * License: AGPLv3
 */
$(function () {
    function Autologin_configViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];
        self.accessViewModel = parameters[1];
        self.loginState = parameters[2];

        // Initialise observables
        self.enabled = ko.observable(false);
        self.loginAs = ko.observable();
        self.localNetworks = ko.observableArray([]);

        self.addressValidationRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/((3[0-2]|[1-2][0-9]|[0-9])|(((255\.){3}(255|254|252|248|240|224|192|128|0+))|((255\.){2}(255|254|252|248|240|224|192|128|0+)\.0)|((255\.)(255|254|252|248|240|224|192|128|0+)(\.0+){2})|((255|254|252|248|240|224|192|128|0+)(\.0+){3})))$/;
        
        // This was taken from the regex used by the popular npm module "cidr-regex" for validating an IPv6 CIDR
        self.ipv6ValidationRegex = /^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;

        self.newLocalNetwork = ko.observable("");
        self.newLocalNetworkIsValid = ko.computed(function () {
            var filtered_networks = ko.utils.arrayFilter(
                self.localNetworks(),
                function (item) {
                    return item === self.newLocalNetwork();
                }
            );
            return (
                filtered_networks.length === 0 &&
                (self.addressValidationRegex.test(self.newLocalNetwork()) ||
                    self.ipv6ValidationRegex.test(self.newLocalNetwork()))
            );
        });
        self.allUsers = ko.observableArray([]);

        self.addLocalNetwork = function () {
            if (!self.check_admin()) {
                return;
            }
            self.localNetworks.unshift(ko.observable(self.newLocalNetwork()));
            self.newLocalNetwork("");
        };

        self.removeLocalNetwork = function (network) {
            if (!self.check_admin()) {
                return;
            }

            self.localNetworks.remove(network);
        };

        self.check_admin = function () {
            return self.loginState.hasPermission(
                self.accessViewModel.permissions.ADMIN
            );
        };

        self.onSettingsBeforeSave = function () {
            if (!self.check_admin()) {
                return;
            }
            var localNetworksArray = [];
            _.each(self.localNetworks(), function (network) {
                localNetworksArray.push(network());
            });
            OctoPrint.simpleApiCommand("autologin_config", "save_config", {
                enabled: self.enabled(),
                loginAs: self.loginAs(),
                localNetworks: localNetworksArray,
            }).done(self.on_api_repsonse);
        };

        self.onAllBound = function () {
            if (self.check_admin()) {
                OctoPrint.simpleApiGet("autologin_config").done(
                    self.on_api_repsonse
                );
            }
            OctoPrint.access.users.list().done(function (response) {
                _.each(response.users, function (user) {
                    self.allUsers.push(user.name);
                });
            });
        };

        self.on_api_repsonse = function (response) {
            if (response.enabled) {
                self.enabled(true);
            }
            if (response.loginAs) {
                self.loginAs(response.loginAs);
            }
            if (response.localNetworks) {
                self.localNetworks([]);
                _.each(response.localNetworks, function (network) {
                    self.localNetworks.push(ko.observable(network));
                });
            }
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: Autologin_configViewModel,
        dependencies: [
            "settingsViewModel",
            "accessViewModel",
            "loginStateViewModel",
        ],
        elements: ["#settings_plugin_autologin_config"],
    });
});

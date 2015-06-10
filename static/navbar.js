/**
 * Created by ovolosch on 10.06.15.
 */

define(function(require) {
    var $ = require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var NavBar = React.createClass({displayName: "NavBar",
        render: function () {
            return (
                React.createElement("div", {className: "container-fluid"}, 
                    React.createElement(DataCenterForm, null), 
                    React.createElement(VCenterStatus, null)
                )
            )
        }
    });

    var DataCenterForm = React.createClass({displayName: "DataCenterForm",
        mixins: [Reflux.ListenerMixin],
        getInitialState: function() {
            return {
                enabled: true
            }
        },
        componentDidMount: function() {
            this.listenTo(EventsInteraction.stores.ConnectionStore, this.connectionStateChanged);
        },
        connectionStateChanged: function(connectionState) {
            var state = {
                enabled: !(connectionState.connected || connectionState.connecting)
            };
            this.setState(state);
        },
        btnConnectClick: function (evt) {
            evt.preventDefault();
            var formData = $('#vCenterConnectForm').serializeArray();
            var formDataDict = {};
            for (var i = 0; i < formData.length; i++) {
                var formItem = formData[i];
                formDataDict[formItem.name] = formItem.value;
            }

            EventsInteraction.actions.connectAction(formDataDict);
        },
        render: function () {
            return (
                React.createElement("form", {action: "#", id: "vCenterConnectForm", className: "navbar-form navbar-left", onSubmit: this.btnConnectClick}, 
                    React.createElement("div", {className: "form-group"}, 
                        React.createElement("input", {type: "text", name: "vCenter", className: "form-control", 
                               placeholder: "vCenter", defaultValue: "localhost:9101", 
                               disabled: this.state.enabled ? '' : 'disabled'}
                            )
                    ), 
                    React.createElement("div", {className: "form-group"}, 
                        React.createElement("input", {type: "text", name: "username", className: "form-control", 
                               placeholder: "Username", defaultValue: "atlas", 
                               disabled: this.state.enabled ? '' : 'disabled'}
                            )
                    ), 
                    React.createElement("div", {className: "form-group"}, 
                        React.createElement("input", {type: "password", name: "password", className: "form-control", 
                               placeholder: "Password", defaultValue: "", 
                               disabled: this.state.enabled ? '' : 'disabled'}
                            )
                    ), 
                    React.createElement("button", {className: "btn btn-default", disabled: this.state.enabled ? '' : 'disabled'}, 
                        React.createElement("span", {className: "glyphicon glyphicon-flash"}), " Connect"
                    )
                )
            );
        }
    });

    var VCenterStatus = React.createClass({displayName: "VCenterStatus",
        mixins: [Reflux.ListenerMixin],
        getInitialState: function() {
            return {
                connected: false,
                connecting: false,
                vCenter: null
            }
        },
        componentDidMount: function() {
            this.listenTo(EventsInteraction.stores.ConnectionStore, this.connectionStateChanged);
        },
        connectionStateChanged: function(connectionState) {
            this.setState({
                connected: connectionState.connected,
                connecting: connectionState.connecting,
                vCenter: connectionState.vCenter
            });
        },
        render: function() {
            var message = '';
            if (this.state.connected)
                message = "Connected to " + this.state.vCenter;
            else if (this.state.connecting)
                message = "Connecting to " + this.state.vCenter;
            else
                message = "Disconnected";
            return (
                React.createElement("ul", {className: "nav navbar-nav navbar-right"}, 
                    React.createElement("li", null, 
                        React.createElement("a", {href: "#"}, 
                            message
                        )
                    )
                )
            )
        }
    });

    return NavBar;
});
/**
 * Created by ovolosch on 10.06.15.
 */

define(function(require) {
    $ = require('jquery');
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
                        React.createElement("input", {type: "text", name: "vCenter", className: "form-control", placeholder: "vCenter", defaultValue: "localhost:9101"})
                    ), 
                    React.createElement("div", {className: "form-group"}, 
                        React.createElement("input", {type: "text", name: "username", className: "form-control", placeholder: "Username", defaultValue: "atlas"})
                    ), 
                    React.createElement("div", {className: "form-group"}, 
                        React.createElement("input", {type: "password", name: "password", className: "form-control", placeholder: "Password", defaultValue: ""})
                    ), 
                    React.createElement("button", {className: "btn btn-default"}, 
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
                vCenter: null
            }
        },
        componentDidMount: function() {
            this.listenTo(EventsInteraction.stores.ConnectionStore, this.connectionStateChanged);
        },
        connectionStateChanged: function(vCenter) {
            if (vCenter != null) {
                this.setState({
                    connected: true,
                    vCenter: vCenter
                });
            }
            else {
                this.setState({
                    connected: false,
                    vCenter: null
                });
            }
        },
        render: function() {
            return (
                React.createElement("ul", {className: "nav navbar-nav navbar-right"}, 
                    React.createElement("li", null, 
                        React.createElement("a", {href: "#"}, 
                            this.state.connected ? "Connected to " + this.state.vCenter : "Disconnected"
                        )
                    )
                )
            )
        }
    });

    return NavBar;
});
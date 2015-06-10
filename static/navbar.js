/**
 * Created by ovolosch on 10.06.15.
 */

define(function(require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var NavBar = React.createClass({displayName: "NavBar",
        render: function () {
            return (
                React.createElement("div", null, 
                    React.createElement(DataCenterForm, null)
                )
            )
        }
    });

    var DataCenterForm = React.createClass({displayName: "DataCenterForm",
        btnRefreshClick: function (evt) {
            evt.preventDefault();
            EventsInteraction.actions.fetchVMListAction();
        },
        render: function () {
            return (
                React.createElement("form", {action: "#", className: "navbar-form navbar-left", onSubmit: this.btnRefreshClick}, 
                    React.createElement("button", {className: "btn btn-default btn-lg"}, 
                        React.createElement("span", {className: "glyphicon glyphicon-refresh"}), " Refresh"
                    )
                )
            );
        }
    });

    return NavBar;
});
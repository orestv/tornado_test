/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    require('bootstrap');
    var React = require('react');


    var MainContent = React.createClass({displayName: "MainContent",
        render: function () {
            return (
                React.createElement("div", null, "Hello world!")
            );
        }
    });

    var StatusBar = React.createClass({displayName: "StatusBar",
        render: function() {
            return (
                React.createElement("div", null, 
                    "Hello world from status bar!"
                )
            );
        }
    });

    $(document).ready(function () {
        React.render(
            React.createElement(MainContent, null),
            document.getElementById('content')
        );

        React.render(
            React.createElement(StatusBar, null),
            document.getElementById('status-bar')
        );
    });
});
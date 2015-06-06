/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    require('bootstrap');
    var React = require('react');


    var MainContent = React.createClass({
        render: function () {
            return (
                <div>Hello world!</div>
            );
        }
    });

    var StatusBar = React.createClass({
        render: function() {
            return (
                <div>
                    Hello world from status bar!
                </div>
            );
        }
    });

    $(document).ready(function () {
        React.render(
            <MainContent/>,
            document.getElementById('content')
        );

        React.render(
            <StatusBar/>,
            document.getElementById('status-bar')
        );
    });
});
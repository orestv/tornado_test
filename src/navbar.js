/**
 * Created by ovolosch on 10.06.15.
 */

define(function(require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var NavBar = React.createClass({
        render: function () {
            return (
                <div>
                    <DataCenterForm/>
                </div>
            )
        }
    });

    var DataCenterForm = React.createClass({
        btnRefreshClick: function (evt) {
            evt.preventDefault();
            EventsInteraction.actions.fetchVMListAction();
        },
        render: function () {
            return (
                <form action="#" className="navbar-form navbar-left" onSubmit={this.btnRefreshClick}>
                    <button className="btn btn-default btn-lg">
                        <span className="glyphicon glyphicon-refresh"></span> Refresh
                    </button>
                </form>
            );
        }
    });

    return NavBar;
});
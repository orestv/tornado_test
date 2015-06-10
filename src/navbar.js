/**
 * Created by ovolosch on 10.06.15.
 */

define(function(require) {
    $ = require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var NavBar = React.createClass({
        render: function () {
            return (
                <div className="container-fluid">
                    <DataCenterForm/>
                    <VCenterStatus/>
                </div>
            )
        }
    });

    var DataCenterForm = React.createClass({
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
                <form action="#" id="vCenterConnectForm" className="navbar-form navbar-left" onSubmit={this.btnConnectClick}>
                    <div className="form-group">
                        <input type="text" name="vCenter" className="form-control" placeholder="vCenter" defaultValue="localhost:9101"/>
                    </div>
                    <div className="form-group">
                        <input type="text" name="username" className="form-control" placeholder="Username" defaultValue="atlas"/>
                    </div>
                    <div className="form-group">
                        <input type="password" name="password" className="form-control" placeholder="Password" defaultValue=""/>
                    </div>
                    <button className="btn btn-default">
                        <span className="glyphicon glyphicon-flash"></span> Connect
                    </button>
                </form>
            );
        }
    });

    var VCenterStatus = React.createClass({
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
                <ul className="nav navbar-nav navbar-right">
                    <li>
                        <a href="#">
                            {this.state.connected ? "Connected to " + this.state.vCenter : "Disconnected"}
                        </a>
                    </li>
                </ul>
            )
        }
    });

    return NavBar;
});
/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsStatusBar = require('events_statusbar');
    var EventsInteraction = require('events_interaction');

    var VMList = React.createClass({
        mixins: [Reflux.ListenerMixin],
        getInitialState: function() {
            return {
                vms: []
            }
        },
        componentDidMount: function() {
            this.listenTo(EventsInteraction.stores.VMListStore, this.loadVMList);
        },
        loadVMList: function(vmList) {
            this.setState({
                vms: vmList
            })
        },
        render: function () {
            return (
                <table className="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Current Snapshot</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                {this.state.vms.map(function(vm){
                    return (
                        <VMRow key={vm.id} vm={vm}/>
                    )
                })}
                </tbody>
                </table>
            );
        }
    });

    var VMRow = React.createClass({
        render: function() {
            return (
                <tr>
                    <td>{this.props.vm.name}</td>
                    <td>{this.props.vm.currentSnapshotName}</td>
                    <td><VMActions vm={this.props.vm}/></td>
                </tr>
            )
        }
    });

    var VMActions = React.createClass({
        render: function() {
            return (
                <div>
                    <button className="button">
                        <span className="glyphicon glyphicon-refresh"></span>
                        Refresh
                    </button>
                </div>
            )
        }
    });

    var Navbar = React.createClass({
        btnRefreshClick: function(evt) {
            evt.preventDefault();
            EventsInteraction.actions.fetchVMListAction();
        },
        render: function() {
            return (
                <form action="#" className="navbar-form navbar-left" onSubmit={this.btnRefreshClick}>
                    <button className="btn btn-default btn-lg">
                        <span className="glyphicon glyphicon-refresh"></span> Refresh
                    </button>
                </form>
            )
        }
    });

    var StatusBar = React.createClass({
        mixins: [Reflux.ListenerMixin],
        getInitialState: function() {
            return {
                tasks: {}
            }
        },
        componentDidMount: function(){
            this.listenTo(EventsStatusBar.stores.StatusStore, this.tasksUpdated);
        },
        tasksUpdated: function(tasks) {
            this.setState({tasks: tasks});
        },
        render: function() {
            var taskList = [];
            for (var id in this.state.tasks)
                taskList.push(this.state.tasks[id]);
            return (
                <table className="table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Start date</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        taskList.map(function(item) {
                            return (
                                <StatusBarItem key={item.id} item={item}/>
                            );
                        })
                    }
                    </tbody>
                </table>
            );
        }
    });

    var StatusBarItem = React.createClass({
        render: function() {
            return (
                <tr>
                    <td>{this.props.item.name}</td>
                    <td>{this.props.item.start_date}</td>
                    <td>{this.props.item.status}</td>
                </tr>
            )
        }
    });

    return {
        vmList: VMList,
        statusbar: StatusBar,
        navbar: Navbar
    }
});
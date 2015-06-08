/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsStatusBar = require('events_statusbar');
    var EventsInteraction = require('events_interaction');

    var VMList = React.createClass({displayName: "VMList",
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
                React.createElement("table", {className: "table"}, 
                React.createElement("thead", null, 
                    React.createElement("tr", null, 
                        React.createElement("th", null, "Name"), 
                        React.createElement("th", null, "Current Snapshot"), 
                        React.createElement("th", null, "Actions")
                    )
                ), 
                React.createElement("tbody", null, 
                this.state.vms.map(function(vm){
                    return (
                        React.createElement(VMRow, {key: vm.id, vm: vm})
                    )
                })
                )
                )
            );
        }
    });

    var VMRow = React.createClass({displayName: "VMRow",
        render: function() {
            return (
                React.createElement("tr", null, 
                    React.createElement("td", null, this.props.vm.name), 
                    React.createElement("td", null, this.props.vm.currentSnapshotName), 
                    React.createElement("td", null, React.createElement(VMActions, {vm: this.props.vm}))
                )
            )
        }
    });

    var VMActions = React.createClass({displayName: "VMActions",
        render: function() {
            return (
                React.createElement("div", null, 
                    React.createElement("button", {className: "button"}, 
                        React.createElement("span", {className: "glyphicon glyphicon-refresh"}), 
                        "Refresh"
                    )
                )
            )
        }
    });

    var Navbar = React.createClass({displayName: "Navbar",
        btnRefreshClick: function(evt) {
            evt.preventDefault();
            EventsInteraction.actions.fetchVMListAction();
        },
        render: function() {
            return (
                React.createElement("form", {action: "#", className: "navbar-form navbar-left", onSubmit: this.btnRefreshClick}, 
                    React.createElement("button", {className: "btn btn-default btn-lg"}, 
                        React.createElement("span", {className: "glyphicon glyphicon-refresh"}), " Refresh"
                    )
                )
            )
        }
    });

    var StatusBar = React.createClass({displayName: "StatusBar",
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
                React.createElement("table", {className: "table"}, 
                    React.createElement("thead", null, 
                    React.createElement("tr", null, 
                        React.createElement("th", null, "Name"), 
                        React.createElement("th", null, "Start date"), 
                        React.createElement("th", null, "Status")
                    )
                    ), 
                    React.createElement("tbody", null, 
                    
                        taskList.map(function(item) {
                            return (
                                React.createElement(StatusBarItem, {key: item.id, item: item})
                            );
                        })
                    
                    )
                )
            );
        }
    });

    var StatusBarItem = React.createClass({displayName: "StatusBarItem",
        render: function() {
            return (
                React.createElement("tr", null, 
                    React.createElement("td", null, this.props.item.name), 
                    React.createElement("td", null, this.props.item.start_date), 
                    React.createElement("td", null, this.props.item.status)
                )
            )
        }
    });

    return {
        vmList: VMList,
        statusbar: StatusBar,
        navbar: Navbar
    }
});
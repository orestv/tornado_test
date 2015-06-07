/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsStatusBar = require('events_statusbar');

    var MainContent = React.createClass({displayName: "MainContent",
        render: function () {
            return (
                React.createElement("div", null, "Hello world!")
            );
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
        main: MainContent,
        statusbar: StatusBar
    }
});
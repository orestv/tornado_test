/**
 * Created by ovolosch on 10.06.15.
 */


define(function(require){
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsStatusBar = require('events_statusbar');
    var EventsInteraction = require('events_interaction');

    var StatusBar = React.createClass({
        mixins: [Reflux.ListenerMixin],
        getInitialState: function () {
            return {
                tasks: {}
            }
        },
        componentDidMount: function () {
            this.listenTo(EventsStatusBar.stores.StatusStore, this.tasksUpdated);
        },
        tasksUpdated: function (tasks) {
            this.setState({tasks: tasks});
        },
        render: function () {
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
                        taskList.map(function (item) {
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
        render: function () {
            return (
                <tr>
                    <td>{this.props.item.name}</td>
                    <td>{this.props.item.start_date}</td>
                    <td>{this.props.item.status}</td>
                </tr>
            )
        }
    });

    return StatusBar;
});
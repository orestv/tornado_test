/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var VMList = React.createClass({
        mixins: [Reflux.ListenerMixin],
        getInitialState: function () {
            return {
                vms: []
            }
        },
        componentDidMount: function () {
            this.listenTo(EventsInteraction.stores.VMListStore, this.loadVMList);
        },
        loadVMList: function (vmList) {
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
                    {this.state.vms.map(function (vm) {
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
        render: function () {
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
        render: function () {
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


    return VMList;
});
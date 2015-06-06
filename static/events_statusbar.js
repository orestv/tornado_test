/**
 * Created by seth on 6/7/15.
 */

define(function(require){
    require('jquery');
    var Reflux = require('reflux');

    var tasksReceivedAction = Reflux.createAction();
    var taskUpdatedAction = Reflux.createAction();

    var StatusStore = Reflux.createStore({
        init: function(){
            this.taskDict = {};
            this.listenTo(tasksReceivedAction, this.tasksReceivedHandler);
            this.listenTo(taskUpdatedAction, this.taskUpdatedHandler);
        },
        tasksReceivedHandler: function(tasks){
            this.taskDict = tasks;
            this.trigger(this.taskDict);
        },
        taskUpdatedHandler: function(task){
            this.taskDict[task.id] = task;
            this.trigger(this.taskDict);
        }
    });

    var wsStatus = new WebSocket('ws://' + window.location.host + '/status.ws');
    wsStatus.onmessage = function(evt) {
        var data = evt.data;
        data = JSON.parse(data);
        switch (data.action) {
            case 'LIST':
                tasksReceivedAction(data.tasks);
                break;
            case 'UPDATE':
                taskUpdatedAction(data.task);
                break;
        }
    };

    return {
        actions: {
            tasksReceivedAction: tasksReceivedAction,
            taskUpdatedAction: taskUpdatedAction
        },
        stores: {
            StatusStore: StatusStore
        }
    }
});
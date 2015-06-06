/**
 * Created by seth on 6/7/15.
 */

define(function(require){
    require('jquery');
    var Reflux = require('reflux');

    var buttonClickedAction = Reflux.createAction();

    var InteractionStore = Reflux.createStore({
        init: function() {
            this.listenTo(buttonClickedAction, this.buttonClickedHandler);
        },
        buttonClickedHandler: function() {
            var messageDict = {
                'action': 'buttonClicked'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');

    return {
        actions: {
            buttonClickedAction: buttonClickedAction
        },
        stores: {
            ActionStore: InteractionStore
        }
    }
});
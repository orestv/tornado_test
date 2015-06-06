import json

import tornado
import tornado.web
import tornado.websocket

class HelloHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        self.render('main.html')


class ActionHandler(tornado.websocket.WebSocketHandler):
    pass


class TaskStatusHandler(tornado.websocket.WebSocketHandler):
    _tasks = {}

    @staticmethod
    def add_task(task_id, name, status):
        task = {
            'id': task_id,
            'name': name,
            'status': status,
        }
        TaskStatusHandler._tasks[task_id] = task

    @staticmethod
    def tasks():
        return TaskStatusHandler._tasks

    def open(self, *args, **kwargs):
        message_dict = {
            'action': 'LIST',
            'tasks': TaskStatusHandler.tasks(),
        }
        message_json = json.dumps(message_dict)
        self.write_message(message_json)

    def on_message(self, message):
        pass
import datetime
import functools
import json
import re
import time
import uuid

import tornado
import tornado.gen
import tornado.web
import tornado.websocket

import pysphere


class HelloHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        self.render('main.html')


class TaskStatusHandler(tornado.websocket.WebSocketHandler):
    _tasks = {}
    _clients = []

    ACTION_UPDATE = 'UPDATE'

    @staticmethod
    def add_task(name, status):
        task_id = uuid.uuid4().get_hex()
        task = {
            'id': task_id,
            'name': name,
            'start_date': datetime.datetime.now().isoformat(),
            'status': status,
        }
        TaskStatusHandler._tasks[task_id] = task

        message_dict = {
            'action': TaskStatusHandler.ACTION_UPDATE,
            'task': task,
        }
        TaskStatusHandler.send_all_clients(message_dict)

        return task_id

    @staticmethod
    def update_task(task_id, status):
        task = TaskStatusHandler.tasks()[task_id]
        task['status'] = status

        message_dict = {
            'action': TaskStatusHandler.ACTION_UPDATE,
            'task': task
        }
        TaskStatusHandler.send_all_clients(message_dict)

    @staticmethod
    def tasks():
        return TaskStatusHandler._tasks

    @staticmethod
    def clients():
        return TaskStatusHandler._clients

    @staticmethod
    def send_all_clients(message_dict):
        message_json = json.dumps(message_dict)
        for client in TaskStatusHandler.clients():
            client.write_message(message_json)

    def on_close(self):
        TaskStatusHandler.clients().remove(self)

    def open(self, *args, **kwargs):
        message_dict = {
            'action': 'LIST',
            'tasks': TaskStatusHandler.tasks(),
        }
        message_json = json.dumps(message_dict)
        self.write_message(message_json)

        TaskStatusHandler.clients().append(self)

    def on_message(self, message):
        pass


def task(task_name, initial_status, final_status=None):

    def decorator(func):

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            task_id = TaskStatusHandler.add_task(task_name, initial_status)
            kwargs['task_id'] = task_id
            try:
                result = func(*args, **kwargs)
                if final_status:
                    TaskStatusHandler.update_task(task_id, final_status)
                return result
            except Exception as e:
                TaskStatusHandler.update_task(task_id, 'Exception: {0}'.format(e.message))

        return wrapper

    return decorator


class ActionHandler(tornado.websocket.WebSocketHandler):
    ACTION_VM_LIST = 'VMList'
    ACTION_CONNECT = 'Connect'

    server = None

    def get_handler(self, action):
        handlers = {
            'refreshVMList': self.refresh_vm_list_handler,
            'Connect': self.connect,
        }
        return handlers[action]

    def get_vm_list(self):
        vms = self.server.get_registered_vms()
        vm_regexp = re.compile('(?P<datastore>\[.*\]) (?P<name>.*)/(?P<path>.*)')
        result_list = []
        for vm in vms:
            match = re.match(vm_regexp, vm)
            result_list.append({
                'datastore': match.group('datastore'),
                'id': match.group('path'),
                'name': match.group('name'),
                'path': match.group('path'),
            })

        return result_list

    @tornado.gen.coroutine
    @task('VM List fetch', 'Started...')
    def refresh_vm_list_handler(self, task_id, parameters):
        TaskStatusHandler.update_task(task_id, 'Fetching VM list...')
        vm_list = yield self.application.executor.submit(self.get_vm_list)
        TaskStatusHandler.update_task(task_id, 'VM list fetched...')

        message_dict = {
            'action': ActionHandler.ACTION_VM_LIST,
            'vm_list': vm_list,
        }
        message_json = json.dumps(message_dict)
        self.write_message(message_json)

        TaskStatusHandler.update_task(task_id, 'Finished')

        raise tornado.gen.Return()

    @task('Connect to vCenter', 'Initiating connection', 'Connected successfully!')
    def connect(self, task_id, parameters):
        vCenterHost = parameters['vCenter']
        vCenterUsername = parameters['username']
        vCenterPassword = parameters['password']

        TaskStatusHandler.update_task(task_id, 'Connecting to vCenter {0}'.format(vCenterHost))
        self.server = pysphere.VIServer()
        self.server.connect(vCenterHost, vCenterUsername, vCenterPassword)

        message_dict = {
            'action': ActionHandler.ACTION_CONNECT,
            'vCenter': vCenterHost
        }
        self.write_message(json.dumps(message_dict))

    def on_message(self, message):
        message_dict = json.loads(message)
        handler = self.get_handler(message_dict['action'])
        parameters = message_dict.get('parameters', None)

        try:
            handler(parameters=parameters)
        except Exception as e:
            pass


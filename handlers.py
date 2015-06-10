import concurrent.futures.thread
import datetime
import functools
import json
import re
import time
import uuid
from pysphere.vi_virtual_machine import VIVirtualMachine

import tornado
import tornado.gen
import tornado.web
import tornado.websocket

import pysphere
from pysphere.resources.vi_exception import VIException


class HelloHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        self.render('main.html')


class TaskStatusHandler(tornado.websocket.WebSocketHandler):
    TASK_LIFE = 15
    _tasks = {}
    _clients = []

    _executor = concurrent.futures.thread.ThreadPoolExecutor(2)

    ACTION_UPDATE = 'UPDATE'
    ACTION_LIST = 'LIST'

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
    def push_task_list():
        message_dict = {
            'action': TaskStatusHandler.ACTION_LIST,
            'tasks': TaskStatusHandler.tasks(),
        }
        TaskStatusHandler.send_all_clients(message_dict)

    @staticmethod
    def delete_task(task_id):
        TaskStatusHandler._executor.submit(TaskStatusHandler._delete_task, task_id)

    @staticmethod
    def _delete_task(task_id):
        del TaskStatusHandler.tasks()[task_id]
        time.sleep(TaskStatusHandler.TASK_LIFE)
        TaskStatusHandler.push_task_list()

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
        TaskStatusHandler.clients().append(self)

        TaskStatusHandler.push_task_list()

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
                    TaskStatusHandler.delete_task(task_id)
                return result
            except Exception as e:
                TaskStatusHandler.update_task(task_id, 'Exception: {0}'.format(e.message))
                TaskStatusHandler.delete_task(task_id)

        return wrapper

    return decorator


class ActionHandler(tornado.websocket.WebSocketHandler):
    ACTION_REFRESH_VM_LIST = 'refresh_vm_list'
    ACTION_CONNECT = 'connect'
    ACTION_FETCH_SNAPSHOTS = 'fetch_snapshots'

    MSG_VM_LIST = 'vm_list'
    MSG_SNAPSHOT_LIST = 'snapshot_list'

    MSG_CONNECTED = 'connected'
    MSG_DISCONNECTED = 'disconnected'

    server = None

    def get_handler(self, action):
        handlers = {
            self.ACTION_REFRESH_VM_LIST: self.refresh_vm_list_handler,
            self.ACTION_CONNECT: self.connect,
            self.ACTION_FETCH_SNAPSHOTS: self.get_snapshots,
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
    @task('Snapshots fetch', 'Started...')
    def get_snapshots(self, task_id, parameters):

        vm_name = parameters['vm_id']

        TaskStatusHandler.update_task(task_id, 'Searching for vm {0}...'.format(vm_name))

        vm = yield self.application.executor.submit(self.server.get_vm_by_name, parameters['vm_id'])

        TaskStatusHandler.update_task(task_id, 'Found vm {0}, looking for snapshots...'.format(vm_name))

        snapshots = yield self.application.executor.submit(vm.get_snapshots)

        snapshot_list = [snapshot.get_name() for snapshot in snapshots]

        self.send_typed_message(ActionHandler.MSG_SNAPSHOT_LIST,
                                vm_id=parameters['vm_id'],
                                snapshot_list=snapshot_list)

        TaskStatusHandler.update_task(task_id, 'Snapshots for VM {0} fetched!'.format(vm_name))
        TaskStatusHandler.delete_task(task_id)

    @tornado.gen.coroutine
    @task('VM List fetch', 'Started...')
    def refresh_vm_list_handler(self, task_id, parameters):
        TaskStatusHandler.update_task(task_id, 'Fetching VM list...')
        vm_list = yield self.application.executor.submit(self.get_vm_list)
        TaskStatusHandler.update_task(task_id, 'VM list fetched...')

        self.send_typed_message(self.MSG_VM_LIST, vm_list=vm_list)

        TaskStatusHandler.update_task(task_id, 'Finished')
        TaskStatusHandler.delete_task(task_id)

        raise tornado.gen.Return()

    @task('Connect to vCenter', 'Initiating connection', 'Connected successfully!')
    def connect(self, task_id, parameters):
        vCenterHost = parameters['vCenter']
        vCenterUsername = parameters['username']
        vCenterPassword = parameters['password']

        TaskStatusHandler.update_task(task_id, 'Connecting to vCenter {0}'.format(vCenterHost))
        try:
            self.server = pysphere.VIServer()
            self.server.connect(vCenterHost, vCenterUsername, vCenterPassword)
        except VIException as e:
            self.send_typed_message(self.MSG_DISCONNECTED)
            raise

        self.send_typed_message(self.MSG_CONNECTED, vCenter=vCenterHost)

    def send_typed_message(self, message_type, **parameters):
        message_dict = {
            'message': message_type,
            'parameters': parameters,
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


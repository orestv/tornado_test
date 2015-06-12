import os
import time
import threading
import concurrent.futures.thread

import tornado
import tornado.ioloop
import tornado.web

from tornado.web import url
import handlers

ROOT = os.path.curdir


class Application(tornado.web.Application):
    VSPHERE_KEEPALIVE_TIMEOUT = 15

    _executor = concurrent.futures.thread.ThreadPoolExecutor(8)

    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        super(Application, self).__init__(handlers, default_host, transforms, **settings)

        keepalive_thread = threading.Thread(target=Application.vsphere_send_keepalives)
        keepalive_thread.daemon = True
        keepalive_thread.start()

    @staticmethod
    def vsphere_send_keepalives():
        while True:
            time.sleep(Application.VSPHERE_KEEPALIVE_TIMEOUT)
            for client in handlers.ActionHandler.clients():
                client.send_keepalive()

    @property
    def executor(self):
        """
        :rtype: concurrent.futures.thread.ThreadPoolExecutor
        """
        return self._executor


def make_app():
    return Application([
        url(r'/',  handlers.HelloHandler),
        url(r'/interact.ws', handlers.ActionHandler),
        url(r'/status.ws', handlers.TaskStatusHandler),
    ],
        static_path=os.path.join(ROOT, 'static'),
        template_path=os.path.join(ROOT, 'templates'),
        debug=True
    )


def main():

    app = make_app()
    app.listen(8888)

    tornado.ioloop.IOLoop.current().start()


if __name__ == '__main__':
    main()
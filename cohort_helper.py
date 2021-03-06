import sqldbutils as db
import utils
import logging
from os.path import join
import sys
from subprocess import Popen, STDOUT


class CohortHelper(object):
    def __init__(self, conf_file):
        self._cohort_conf = conf_file
        self._conf = None
        self._patient_ids = []
        self.load_config()

    def load_config(self):
        self._conf = utils.load_json_data(self._cohort_conf)
        self.load_cohort(self._conf['patient_id_file'])

    def load_cohort(self, patient_id_file):
        lines = utils.read_text_file(patient_id_file)
        self._patient_ids = [l.split('\t')[0] for l in lines]

    def extract_cohort_docs(self):
        db_conf_file = self._cohort_conf
        db_conf = None
        if 'linux_dsn_setting' in self._conf and self._conf['linux_dsn_setting']:
            db_conf = self.populate_linux_odbc_setting()
            db_conf_file = None
            logging.info('using dsn %s' % db_conf['dsn'])
        query_size = self._conf['query_size'] if 'query_size' in self._conf else 50
        file_pattern = self._conf['file_pattern'] if 'file_pattern' in self._conf else '%s.txt'
        out_put_folder = self._conf['out_put_folder']
        if len(self._patient_ids) == 0:
            logging.info('cohort is empty, has it been loaded?')
            return
        q_temp = self._conf['doc_query_temp']
        logging.info('working on extraction, cohort size:%s' % len(self._patient_ids))
        for idx in range(0, len(self._patient_ids), query_size):
            q = q_temp.format(**{'patient_ids': ",".join(["'%s'" % p for p in self._patient_ids[idx:idx+query_size]])})
            logging.info('querying batch %s' % (idx + 1))
            logging.debug(q)
            docs = []
            db.query_data(q, docs, db.get_db_connection_by_setting(db_conf_file, db_conf))
            for d in docs:
                utils.save_string(d['doc_content'], join(out_put_folder, file_pattern % d['doc_id']))
        logging.info('query finished, docs saved to %s' % out_put_folder)

    def populate_linux_odbc_setting(self, template_file='./docker/linux_odbc_init_temp.sh'):
        s = utils.read_text_file_as_string(template_file)
        ret = s.format(**{'host': self._conf['server'], 'port': self._conf['port'],
                          'database': self._conf['database']})
        utils.save_string(ret, template_file)
        cmd = 'sh %s' % template_file
        p = Popen(cmd, shell=True, stderr=STDOUT)
        p.wait()
        if 0 != p.returncode:
            logging.error('ERROR doing the ODBC setting, stopped with a coide [%s]' % p.returncode)
            exit(p.returncode)
        return {'dsn': 'semehrdns', 'user': self._conf['user'],
                'password': self._conf['password'],
                'database': self._conf['database']}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print 'syntax: python cohort_helper.py JSON_CONF_FILE_PATH'
    else:
        log_level = 'INFO'
        log_format = '%(name)s %(asctime)s %(levelname)s %(message)s'
        log_file = '/data/semehr-cohort.log'
        logging.basicConfig(level=log_level, format=log_format)
        formatter = logging.Formatter(log_format)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logging.getLogger().addHandler(file_handler)
        logging.info('logging to %s' % log_file)

        ch = CohortHelper(sys.argv[1])
        ch.extract_cohort_docs()
        logging.info('docs extracted')
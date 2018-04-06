import re
import utils

_text_window = 60
_head_text_window_size = 200


class AnnRuleExecutor(object):

    def __init__(self):
        self._text_window = _text_window
        self._filter_rules = []
        pass

    def add_filter_rule(self, token_offset, reg_strs):
        self._filter_rules.append({'offset': token_offset, 'regs': reg_strs})

    def execute(self, text, ann_start, ann_end):
        s_before = text[max(ann_start - self._text_window, 0):ann_start]
        s_end = text[ann_end:min(len(text), ann_end + self._text_window)]
        # tokens_before = nltk.word_tokenize(s_before)
        # tokens_end = nltk.word_tokenize(s_end)
        # print tokens_before
        # print tokens_end
        filtered = False
        matched = []
        for r in self._filter_rules:
            s_compare = s_end if r['offset'] > 0 else s_before
            if r['offset'] == 0:
                s_compare = text[:_head_text_window_size]
            s_compare = s_compare.replace('\n', ' ')
            reg_p = re.compile('|'.join(r['regs']), re.IGNORECASE)
            # print 'matching %s on %s' % (reg_p, s_compare)
            m = reg_p.match(s_compare)
            if m is not None:
                # print m.group(0)
                matched.append([m.group(0), r['regs']])
                filtered = True
                break
        return filtered, matched

    def load_rule_config(self, config_file):
        rule_config = utils.load_json_data(config_file)
        r_path = rule_config['rules_folder']
        print 'loading rules from [%s]' % r_path
        for rf in rule_config['active_rules']:
            for r in utils.load_json_data(join(r_path, rf)):
                self.add_filter_rule(r['offset'], r['regs'])
            print '%s loaded' % rf


if __name__ == "__main__":
    t = "\na close\n frined of hers died of cancer"
    e = AnnRuleExecutor()
    rules = utils.load_json_data('./studies/autoimmune.v2/post_filter_rules.json')
    for r in rules:
        print r
        e.add_filter_rule(r['offset'], r['regs'])
    print e.execute(t, 33,38)

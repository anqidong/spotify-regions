# this was written for Python >3.5; and might not work with Python 2.x

import glob
import itertools
import re
import sys


def main():
  to_process = itertools.chain.from_iterable((glob.iglob(f, recursive=True) for f in sys.argv[1:]))

  pat = re.compile(r'''___file_subst___\((?P<quote>['"])(?P<subst_name>.+?)(?P=quote)\)''')
  
  def file_sub(match_obj):
    subst_name = match_obj.group('subst_name')
    with open(subst_name) as subst_file:
      lines = ''.join(subst_file.readlines())  # bleh inefficient
      return lines

  for file_name in to_process:
    with open(file_name) as file_old, open(file_name + '.sub', mode='w') as file_new:
      for line in file_old:
        changed_str = pat.sub(file_sub, line)
        file_new.write(changed_str)

if __name__ == '__main__':
  main()

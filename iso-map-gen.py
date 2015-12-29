# data source: http://www.nationsonline.org/oneworld/country_code_list.htm

import json
import urllib.request

from bs4 import BeautifulSoup

html = urllib.request.urlopen(
    "http://www.nationsonline.org/oneworld/country_code_list.htm").read()

soup = BeautifulSoup(html)

countries = {}

rows = soup.find(id="codelist")
for row in rows.find_all("tr", recursive=False):
    cells = row.find_all("td", recursive=False)
    if cells: # ignore the header row
        code =    cells[2].get_text().strip()
        country = cells[1].get_text().strip()
        countries[code] = country

output_file = open("country-codes.json", "w")
json.dump(countries, output_file)

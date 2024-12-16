
# Traffic Waze

Traffic Waze is a Python-based tool designed to retrieve and analyze real-time traffic data using the Waze API. It provides functionalities to update a PostGis database on a desired time interval to stock the datas provided by Waze. <br>
Given this database, it also allows to setup a web interface with tools to analyze those datas. <br>

## Installation

To install the necessary dependencies, run:

```bash
pip install -r requirements.txt
```

Ensure you have Python 3.6 or higher installed.

Once this is done, modify the config.properties file with pgAdmin ids and Waze URL -> Run the file Creating_aggregation_web.py -> Go to web_waze folder and follow the instructions :). <br>
No need to run the maj_* files, they are run remotely every 10 min through VisualCron. 

## Scripts 

- Creating_aggregation_web.py : Fetches the data on PostGis, and writes the JSON for the Web interface. 
- maj_waze_alerts_db.py : Writes the alerts data on the PG db.
- maj_waze_jams_db.py : Writes the jams data on the db. 



## Configuration

The tool can be configured using the `config.properties` file. Key parameters include:

- **API Key**: Your Waze API key.
- **Database**: Database infos. <br>

Ensure you have the appropriate permissions and API access before using the tool.


## Acknowledgements

This project utilizes the Waze API for traffic data. 

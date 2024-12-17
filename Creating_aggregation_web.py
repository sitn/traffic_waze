import numpy as np 
import matplotlib.pyplot as plt
import pandas as pd

import psycopg2 as ps2

import time
import geopandas as gpd

import configparser

 
config = configparser.ConfigParser()
config.read('config.properties')  

DB_NAME = config.get('database', 'name')
DB_HOST = config.get('database', 'host')
DB_PORT = config.get('database', 'port')
DB_USER = config.get('database', 'user')
DB_PASSWORD = config.get('database', 'password')

def unix_to_datetime(unix_time):
    # cf. https://strftime.org/
    # convert from milliseconds to seconds
    unix_time = unix_time/1000
    #set conditions to handle particular cases
    if unix_time < 0: 
        return "0 min"
    elif unix_time >= 3600 :
        # more than 1 hour
        unix_time -= 3600
        return time.strftime('%H hour %M min ', time.localtime(unix_time))
    elif unix_time >= 86400 :
        # more than 1 day
        unix_time -= 86400
        return time.strftime('%j day %H hour %M min ', time.localtime(unix_time))
    return time.strftime('%M min ', time.localtime(unix_time))

def longest_geometry(geometries):
    return max(geometries, key=lambda x: x.length)


def define_orientation(geom):
    coords = geom.coords
    if coords[0][0] < coords[1][0] and coords[0][1] < coords[1][1]:
        return 'NE'
    elif coords[0][0] > coords[1][0] and coords[0][1] < coords[1][1]:
        return 'NW'
    elif coords[0][0] < coords[1][0] and coords[0][1] > coords[1][1]:
        return 'SE'
    elif coords[0][0] > coords[1][0] and coords[0][1] > coords[1][1]:
        return 'SW'
    else:
        return 'Unknown'


from sqlalchemy import create_engine
# https://docs.geopandas.org/en/v0.14.4/docs/reference/api/geopandas.read_postgis.html#geopandas.read_postgis
db_connection_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
con = create_engine(db_connection_url)  
alerts_query = "SELECT * FROM waze.alerts"
alerts = gpd.read_postgis(alerts_query, con, geom_col='geometry') 
jams_query = "SELECT * FROM waze.jams"
jams = gpd.read_postgis(jams_query, con, geom_col='geometry')


jams_agg = jams.groupby(['uuid', 'city', 'street', 'pubmillis']).aggregate(lst_timerecms= ('timerecms', 'max'), mean_speedkmh= ('speedkmh', 'mean'), mean_length= ('length', 'mean'), mean_delay= ('delay', 'mean'), mean_level= ('level', 'mean'), roadtype= ('roadtype', 'last'), count = ('timerecms', 'count'), geometry = ('geometry', longest_geometry)).reset_index()
jams_agg['lastingms'] = jams_agg['lst_timerecms']-jams_agg['pubmillis']
jams_agg['lasting'] = jams_agg.apply(lambda x: (unix_to_datetime(x['lst_timerecms']-x['pubmillis'])), axis=1)
jams_agg['pubdate'] = pd.to_datetime(jams_agg['pubmillis'], unit = 'ms') + pd.Timedelta(hours=1)
jams_agg = jams_agg[~(jams_agg['lastingms'] < 0)]# & ~(jams_agg['count'] == 1)]
jams_agg = gpd.GeoDataFrame(jams_agg, geometry='geometry', crs = jams.crs)
# reprojection
jams_agg = jams_agg.to_crs(epsg=2056)


jams_agg['orientation'] = jams_agg['geometry'].apply(define_orientation)

jams_agg.sindex
#jams_agg.to_file("./GPKG/jams_agg.gpkg", driver='GPKG')
jams_agg.to_file("./web_waze/src/data/jams_agg.geojson", driver='GeoJSON')
jams_agg.to_file(r"\\nesitn2\e$\web_repository\web_waze\src\data\jams_agg.geojson", driver='GeoJSON')
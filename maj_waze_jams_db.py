
import requests

import pandas as pd

import geopandas as gpd
import numpy as np
from shapely.geometry import Point, LineString
import psycopg2 as ps2

import configparser


config = configparser.ConfigParser()
config.read('config.properties')  

database_name = config.get('database', 'name')
database_host = config.get('database', 'host')
database_port = config.get('database', 'port')
database_user = config.get('database', 'user')
database_password = config.get('database', 'password')

waze_url = config.get('waze', 'url')


def transform_to_LineString(line):
    coordinates = [(point['x'], point['y']) for point in line]
    return LineString(coordinates)


def json_to_gdf(json_data, columns_gdf):
    #transform json data to gdf
    #only works now for alerts db bcs of 'location'  / 'line' columns. 


    # extract df from json
    df = pd.DataFrame(json_data)
    df = df[columns_gdf]
    # transform into gdf
    gdf = df.copy()
    gdf.loc[:, 'geometry'] = df['line'].apply(transform_to_LineString)
    gdf.drop(columns=['line'], inplace=True)

    gdf = gpd.GeoDataFrame(gdf, crs='EPSG:4326', geometry='geometry')
    # add time of recuperation
    gdf['timeRecMs'] = pd.Series([int(time_begin_UNIX)] * gdf.shape[0])
    gdf['timeRec'] = time_begin

    # select only certain features to put into db 
    gdf = gdf[gdf['delay'] > 0]

    gdf.reset_index(drop=True, inplace=True)

    return gdf



def insert_data(conn, data):
    print("Inserting points into database")

    insert_data_points = '''INSERT INTO waze.jams (uuid, level, city, street, speedKMH, length, roadType, delay, pubMillis, geometry, timeRecMs, timeRec)
    VALUES ( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s); '''
    with conn.cursor() as cursor:
        for i in range(data.shape[0]):
            row = data.iloc[i]
            data_tuple = tuple(value.wkt if isinstance(value, LineString) else value.item() if isinstance(value, (np.integer, np.floating)) 
                               else value for value in row)
            cursor.execute(insert_data_points, data_tuple)
    conn.commit()
    print("Data inserted into database")



if __name__ == "__main__":

    url_all = waze_url

    response = requests.get(url_all)
    if response.status_code == 200:
        data = response.json()

        general_infos = pd.DataFrame.from_dict(pd.json_normalize(data))

        time_begin = general_infos['startTime']
        time_begin = time_begin[0][:11] + str(int(time_begin[0][11:13]) + 1) + time_begin[0][13:]
        time_begin_UNIX = general_infos['startTimeMillis'].values[0]


        #connexion to db

        DB_NAME = database_name
        DB_USER = database_user
        DB_HOST = database_host
        DB_PORT = database_port
        DB_PASSWORD =  database_password #input(f"Enter password for database {DB_NAME}, user {DB_USER} : ")

        print(f"Connecting to database {DB_NAME} on host {DB_HOST} as user {DB_USER}...")
        conn = ps2.connect(dbname=DB_NAME, user=DB_USER, host=DB_HOST,  password=DB_PASSWORD) #,port=DB_PORT
        columns_jams_df = ['uuid', 'level', 'city','street', 'line', 'speedKMH', 'length', 'roadType', 'delay', 'pubMillis']
        jams_db = json_to_gdf(data['jams'], columns_jams_df)
		
        if 'jams' in general_infos.columns:
            insert_data(conn, jams_db)
        
        conn.close()
        print("Connection closed")


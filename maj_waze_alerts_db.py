
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





def json_to_gdf(json_data, columns_gdf):
    #transform json data to gdf

    # extract df from json
    df = pd.DataFrame(json_data)
    df = df[columns_gdf]

    # drop features that are un desired
    type_not_wanted = ['CONSTRUCTION']
    subtype_not_wanted = ['JAM_MODERATE_TRAFFIC', 'JAM_HEAVY_TRAFFIC', 'JAM_STAND_STILL_TRAFFIC',  'HAZARD_ON_ROAD_CONSTRUCTION', 'ROAD_CLOSED_CONSTRUCTION']
    df = df[~df['type'].isin(type_not_wanted)]
    df = df[~df['subtype'].isin(subtype_not_wanted)]

    #drop features that were published more than 24 hours earlier 
    nb_msec_24 = 24*60*60*1000
    df = df[df['pubMillis'] > (time_begin_UNIX - nb_msec_24)]

    #clean data in case of nans
    df.fillna('', inplace=True)

    # reset index
    df.reset_index(drop=True, inplace=True)

    # transform into gdf
    gdf = df.copy()
    gdf.loc[:, 'geometry'] = df['location'].apply(lambda x: Point(x['x'], x['y']))
    gdf.drop(columns=['location'], inplace=True)

    gdf = gpd.GeoDataFrame(gdf, crs='EPSG:4326', geometry='geometry')
    # add time of recuperation
    gdf['timeRecMs'] = pd.Series([int(time_begin_UNIX)] * gdf.shape[0])
    gdf['timeRec'] = time_begin


    gdf.reset_index(drop=True, inplace=True)

    return gdf

def create_table(conn):
    
    create_table = '''CREATE TABLE IF NOT EXISTS waze.alerts (
        uuid TEXT,
        city TEXT,
        street TEXT,
        reportRating int,
        reliability int,
        confidence int, 
        type TEXT,
        subtype TEXT,
        magvar int, 
        roadType int,
        pubMillis bigint,
        timeRecMs bigint,
        timeRec TEXT,
        geometry GEOMETRY(Point, 4326),
        CONSTRAINT alerts_pkey PRIMARY KEY (uuid, timeRecMs) USING INDEX TABLESPACE postgres_data
    ) TABLESPACE postgres_data;
    ALTER TABLE IF EXISTS waze.alerts OWNER TO postgres;
    '''
    print("Creating table alerts if not exists")
    with conn.cursor() as cursor:
        cursor.execute(create_table)
    conn.commit()


def insert_data(conn, data):
    print("Inserting points into database")

    insert_data_points = '''INSERT INTO waze.alerts (uuid, city, street, reportRating, reliability, confidence, type, subtype, pubMillis, roadType, magvar,  geometry, timeRecMs, timeRec)
    VALUES ( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s); '''
    with conn.cursor() as cursor:
        for i in range(data.shape[0]):
            row = data.iloc[i]
            data_tuple = tuple(value.wkt if isinstance(value, Point) else value.item() if isinstance(value, (np.integer, np.floating)) 
                               else value for value in row)
            cursor.execute(insert_data_points, data_tuple)
    conn.commit()
    print("Data inserted into database")

def cleaning_data(conn):
    print("Cleaning data in database")
    # Select first and last occurrences of every events. 
    cleaning_data = '''DELETE FROM waze.alerts WHERE (uuid, timerecms) NOT IN 
                        (SELECT a.uuid, timerecms FROM waze.alerts as a INNER JOIN (
                        SELECT MIN(timerecms) as time, uuid FROM waze.alerts GROUP BY uuid
                        UNION SELECT MAX(timerecms), uuid as time FROM waze.alerts GROUP BY uuid
                        ) as u ON a.timerecms = u.time AND a.uuid = u.uuid
                        ORDER BY a.uuid, timerecms)'''
    with conn.cursor() as cursor:
        cursor.execute(cleaning_data)
    conn.commit()
    print("Data cleaned in database")



if __name__ == "__main__":

    url_all = waze_url
    response = requests.get(url_all)
    if response.status_code == 200:
        data = response.json()
	

        general_infos = pd.DataFrame.from_dict(pd.json_normalize(data))

        time_begin = general_infos['startTime']
        time_begin = time_begin[0][:11] + str(int(time_begin[0][11:13]) + 1) + time_begin[0][13:]
        time_begin_UNIX = general_infos['startTimeMillis'].values[0]

        print("Temps de récup: ", time_begin)



        #connexion to db
        DB_NAME = database_name
        DB_USER = database_user
        DB_HOST = database_host
        DB_PORT = database_port
        DB_PASSWORD =  database_password #input(f"Enter password for database {DB_NAME}, user {DB_USER} : ")
        print(f"Connecting to database {DB_NAME} on host {DB_HOST} as user {DB_USER}...")
        try: 
            conn = ps2.connect(dbname=DB_NAME, user=DB_USER, host=DB_HOST,  password=DB_PASSWORD) #,port=DB_PORT
            print("Connected to database")
        except UnicodeDecodeError:
            print("Error while connecting to database")
            exit()

        columns_alerts_df = ['uuid', 'city', 'street', 'reportRating', 'reliability', 'confidence', 'type', 'subtype','location', 'pubMillis', 'roadType', 'magvar']

        if 'alerts' in general_infos.columns:
            alerts_db = json_to_gdf(data['alerts'], columns_alerts_df)

            #create_table(conn)

            insert_data(conn, alerts_db)

            cleaning_data(conn)

        conn.close()
        print("Connection closed")


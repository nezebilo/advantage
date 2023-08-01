import React, { useEffect, useRef, useState } from 'react';
import './SolutionsContent.css';
import FunctionModule from './FunctionModule';
import MapModule from './MapModule';
import InfoModule from './InfoModule';
import axios from 'axios';
import { Box, Fab, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, useMediaQuery, Badge, Snackbar, Grid } from '@mui/material';
import { useTheme } from '@mui/system';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DifferenceIcon from '@mui/icons-material/Difference';
import CompareBoard from '../Compare/CompareBoard';
import ZoneBoard from '../Cards/ZoneBoard';
import { ALL_BOROUGHS, ALL_AGES } from '../../constants';
import SolutionsContext from './SolutionsContext';
import { getCurrentTimeInNY } from '../../utils/dateTimeUtils';


function SolutionsContent() {

  const [filters, setFilters] = 
    useState({
      boroughs: ALL_BOROUGHS.map(borough => borough.name), 
      groups: ALL_AGES.map(age => age.id), 
      income: [0, Infinity]
    });
  const [filteredZones, setFilteredZones] = useState({});
  const [selectedZone, setSelectedZone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openCompareBoard, setOpenCompareBoard] = useState(false); // compare dialog
  const [openZoneBoard, setOpenZoneBoard] = useState(null); // zone board dialog
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const allZonesRef = useRef(null);
  const [adTime, setAdTime] = useState(['', '']);
  const [adTimeMode, setAdTimeMode] = useState(false);
  // Set the initial state using the current time in New York
  const [realTime, setRealTime] = useState(getCurrentTimeInNY()); // the choosen time in real time Slider
  const [compareZones, setCompareZones] = useState([null, null]);// zones selected to be compared

// Fetch data for initialising
useEffect(() => {
  console.log("UseEffect: Fetch data for initialising");
  setIsLoading(true);

  const fetchData = async () => {
    try {

      const url = "http://127.0.0.1:8000/main/zones/data";//24h impression and business data
      // const url = "./zones_data.json";
      const url_census = 'http://127.0.0.1:8000/main/zones';//census data
      const url_geom = "./map-initialising.json";//GEOM data

      const request1 = axios.get(url);
      const request2 = axios.get(url_census);
      const request3 = axios.get(url_geom);
      
      const [response1, response2, response3] = await Promise.all([request1, request2, request3]);

      if (!(response1.status === 201 && response1.data.status === '1' && response2.status === 201 && response2.data.status === '1' && response3.status === 200)) {
        throw new Error("Can't fetch data for map initialising now!");
      }

      const data_24h = response1.data.data;
      const data_census = response2.data.data;
      const data_GEOM = JSON.parse(response3.data.data);

      console.log("all data here:", [data_24h, data_census, data_GEOM]);

      const impressionMap = {};// mapping from id to the list of 24h impression, each item: [{time1:...,value1:...},...]
      for(let key in data_24h) {
        impressionMap[Number(key)] = data_24h[key].detail.map(detail => {
          return {
            time: detail.datetime,
            value: detail.impression_predict || 0 // if detail has no impression_predict or impression_predict is null, let it be 0
          }
        });
      }

      const ageMap = {}; //mapping from id to the dic of census detail, each item: {mian_group:..., median_income:..., percentages:[]}
      for (let key in data_census) {
        ageMap[Number(key)] = {
          main_group: data_census[key].main_group,
          median_income: data_census[key].median_income,
          percentages: ALL_AGES.map(ageGroup => data_census[key][ageGroup.name_backend])
        };
      }

      const processedData = data_GEOM.features.map(feature => {
        const id = feature.properties.pk;
        const detail = impressionMap[id] || []; 
        const totalValue = detail.reduce((sum, current) => sum + current.value, 0);
        const ageDistributionArray = ageMap[id] ? ageMap[id].percentages : [];// if no census data, let it be empty list
        if (!ageMap[id].median_income) {
          console.log(id);
          console.log(ageMap);
        }
        const median_income = ageMap[id] ? (ageMap[id].median_income ? ageMap[id].median_income.toFixed(0) : null) : null;
        const mode_group = ageMap[id] ? ageMap[id].main_group : null; 
        return {
          ...feature,
          properties: {
            ...feature.properties,
            age: ageDistributionArray,// age: [7, 5, 4, 6, 5, 4, 6, 5, 4, 5, 7, 6, 4, 5, 5, 4, 6, 4, 5, 6]
            average_income: median_income,//change the name later coz it affects other functionalities
            mode_group: mode_group,//'females_25_34'
            impression: {
              realTime: {
                totalValue,
                items: detail,
              },
              adTime: {
                // totalValue,
                // items: [...detail],
                totalValue: 0,
                items: [],
              }
            }
          }
        }
      });

      const processedGeojson = {
        type: "FeatureCollection",
        crs: {type: "name", properties: {name: "EPSG:4326"}},
        features: processedData
      };

      allZonesRef.current = processedGeojson;
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  fetchData();
}, []);

// Change filteredZones when filters, allZoneRef, realTime, adTimeMode change
useEffect(() => {
  console.log("UseEffect: Change filteredZones when filters, allZoneRef, realTime, adTimeMode change");
  console.log("filters", filters);
  console.log("adTimeMode:", adTimeMode);
  console.log("realTime:", realTime);
  console.log("allZonesRef:",allZonesRef);

  // If data has not been loaded, return early to avoid errors
  if (!allZonesRef.current) {
    return;
  }

  setSelectedZone(null);

  const filter_borough = filters.boroughs; // use borough name to match
  const filter_age = filters.groups; // e.g. [0, 1, 2] reps the first 3 age-sex range
  const filter_income = filters.income; // e.g. [300, 500] reps the income range
  // const filter_income = [0, Infinity]; // e.g. [300, 500] reps the income range

  // Filter zones according to borough
  let filteredFeatures = allZonesRef.current.features.filter(feature => {
    return filter_borough.includes(feature.properties.borough);
  });

  // Filter zones according to income
  filteredFeatures = filteredFeatures.filter(feature => {
    return ((feature.properties.average_income >= filter_income[0]) && (feature.properties.average_income <= filter_income[1]));
  });
  // filteredFeatures = allZonesRef.current.features.filter(feature => {
  //   return ((feature.properties.average_income >= filter_income[0]) && (feature.properties.average_income <= filter_income[1]));
  // });

  // Calculate valid impression according to target customers
  // get the valid percentage for each feature
  filteredFeatures = filteredFeatures.map(feature => {

    let validPercentage = 0;
    for (let i = 0; i < filter_age.length; i++) {
      validPercentage += feature.properties.age[filter_age[i]];
    }
    validPercentage = validPercentage / 100;

    // Define function to calculate valid impression
    const calculateValidImpression = (impression) => {
      const totalValidValue = parseFloat((validPercentage * impression.totalValue).toFixed(2));
      const validItems = impression.items.map(item => ({
        ...item,
        validValue: parseFloat((validPercentage * item.value).toFixed(2))
      }));
      return {
        ...impression,
        totalValidValue,
        items: validItems
      };
    };

    // Calculate valid impressions for realTime and adTime
    const realTimeImpression = calculateValidImpression(feature.properties.impression.realTime);
    const adTimeImpression = calculateValidImpression(feature.properties.impression.adTime);

    // Calculate display impression
    let displayTotal, displayValid;
    if (adTimeMode) {
      displayTotal = adTimeImpression.totalValue;
      displayValid = adTimeImpression.totalValidValue;
    } else {
      const realTimeItem = realTimeImpression.items.find(item => item.time === realTime);
      if (realTimeItem) {
        displayTotal = realTimeItem.value;
        displayValid = realTimeItem.validValue;
      }
    }

    return {
      ...feature,
      properties: {
        ...feature.properties,
        impression: {
          realTime: realTimeImpression,
          adTime: adTimeImpression,
          display: {
            total: displayTotal || 0,
            valid: displayValid || 0,
          }
        }
      }
    };
  });

  // Create new structured GeoJSON
  const filteredGeojson = {
    ...allZonesRef.current,
    features: filteredFeatures
  };
  console.log("filteredGeojson:", filteredGeojson);

  setFilteredZones(filteredGeojson);
}, [filters, allZonesRef.current, adTimeMode, realTime]);


  // Change allZonesRef when adTime change
  // fetch data to chnage allZones (impression.adTime) when time range change (ad time)
  useEffect(() => {
    console.log("UseEffect:Change allZonesRef when adTime change");
    console.log("adTime:", adTime);
    if (!adTimeMode) {
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        // url for updating impression in allZones for ad time
        const url = "";
        const response = await axios.get(url);
        if (response.status !== 201 || response.data.status !== "1") {
          throw new Error("Can't fetch data for ad time. Please try it agagin.");
        }
        const data = JSON.parse(response.data.data);

        // process data to the format I want here....
        // change the impression in ad time field
        // ...
        // const processedData = 

        allZonesRef.current = data;
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }

    }

  }, [adTime]);

  const handleClickLikeFab = () => {

    const currentURL = window.location.href;
    const urlObject = new URL(currentURL);
    const likeUrl = new URL('/saved', urlObject);
    window.open(likeUrl, '_blank');
  }

  const handleClickDifference = () => {
    setOpenCompareBoard(true);
  }

  const handleCloseCompareBoard = () => {
    setOpenCompareBoard(false);
  }

  const handleClickMore = (zone) => {
    console.log("zone:", zone);
    setOpenZoneBoard(zone);
  }  

  const handleCloseZoneBoard = () => {
    setOpenZoneBoard(null);
  }

  // return (
  //   <SolutionsContext.Provider value={{ realTime, setRealTime, adTime, setAdTime, adTimeMode, setAdTimeMode, handleClickMore, filteredZones, compareZones, setCompareZones, setOpenCompareBoard }}>
  //     <div className="solutions-content">
  //       <FunctionModule filters={filters} setFilters={setFilters}/>
  //       <div className="map-info-container">
  //         <MapModule zones={filteredZones} selectedZone={selectedZone} setSelectedZone={setSelectedZone} isLoading={isLoading}/>
  //         <InfoModule zones={filteredZones} selectedZone={selectedZone} setSelectedZone={setSelectedZone} isLoading={isLoading}/>
  //         {selectedZone ?
  //           <div id="mapillary" style={{display: 'block'}}></div> :
  //           <div id="mapillary" style={{display: 'none'}}></div>
  //         }
  //       </div>
  //       <Box className='floating-button'>
          
  //         <Fab color="primary" aria-label="compare" onClick={handleClickDifference}>
  //           <Badge badgeContent={compareZones.filter(zone => zone !== null).length} color="primary">
  //             <DifferenceIcon />
  //             </Badge>
  //         </Fab>
          
  //         <Fab color='secondary' aria-label="like" onClick={handleClickLikeFab}>
  //           <FavoriteIcon />
  //         </Fab>
  //       </Box>

  //       <Dialog open={openCompareBoard} onClose={handleCloseCompareBoard} fullScreen={fullScreen} maxWidth='lg'>
  //         <DialogTitle>Compare Board</DialogTitle>
  //         <DialogContent>
  //           <CompareBoard />
  //         </DialogContent>
  //         <DialogActions>
  //           <Button onClick={handleCloseCompareBoard}>Close</Button>
  //         </DialogActions>
  //       </Dialog>

  //       <Dialog open={!!openZoneBoard} onClose={handleCloseZoneBoard} fullScreen={fullScreen} maxWidth='lg'>
  //         <DialogTitle>Zone Board</DialogTitle>
  //         <DialogContent>
  //           {openZoneBoard ? <ZoneBoard zone={openZoneBoard} /> : null}
  //           {/* <ZoneBoard zone={openZoneBoard} />  */}
  //         </DialogContent>
  //         <DialogActions>
  //           <Button onClick={handleCloseZoneBoard}>Close</Button>
  //         </DialogActions>
  //       </Dialog>
  //     </div>
  //   </SolutionsContext.Provider>
  // );

  return (
    <SolutionsContext.Provider value={{ realTime, setRealTime, adTime, setAdTime, adTimeMode, setAdTimeMode, handleClickMore, filteredZones, compareZones, setCompareZones, setOpenCompareBoard }}>
      
      <div className="solutions-content">
      

        <FunctionModule filters={filters} setFilters={setFilters}/>


        <div className="map-info-container">
      <Grid container>
        <Grid item xs={12} md={12} lg={9}>
          <MapModule 
            zones={filteredZones} 
            selectedZone={selectedZone} 
            setSelectedZone={setSelectedZone} 
            isLoading={isLoading} 
            style={{ height: isMobile ? '380px' : '750px' }} // change the height based on the screen size
          />
        </Grid>
        <Grid item xs={12} md={12} lg={3} style={{ height: isMobile ? 'auto' : '750px' }}>
          <InfoModule 
            zones={filteredZones} 
            selectedZone={selectedZone} 
            setSelectedZone={setSelectedZone} 
            isLoading={isLoading} 
          />
        </Grid>
      </Grid>

      {/* {selectedZone ?
        <div id="mapillary" style={{display: 'block'}}></div> :
        <div id="mapillary" style={{display: 'none'}}></div>
      } */}
    </div>


        <Box className='floating-button'>
          
          <Fab color="primary" aria-label="compare" onClick={handleClickDifference}>
            <Badge badgeContent={compareZones.filter(zone => zone !== null).length} color="primary">
              <DifferenceIcon />
              </Badge>
          </Fab>
          
          <Fab color='secondary' aria-label="like" onClick={handleClickLikeFab}>
            <FavoriteIcon />
          </Fab>
        </Box>

        <Dialog open={openCompareBoard} onClose={handleCloseCompareBoard} fullScreen={fullScreen} maxWidth='lg'>
          <DialogTitle>Compare Board</DialogTitle>
          <DialogContent>
            <CompareBoard />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCompareBoard}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!openZoneBoard} onClose={handleCloseZoneBoard} fullScreen={fullScreen} maxWidth='lg'>
          <DialogTitle>Zone Board</DialogTitle>
          <DialogContent>
            {openZoneBoard ? <ZoneBoard zone={openZoneBoard} /> : null}
            {/* <ZoneBoard zone={openZoneBoard} />  */}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseZoneBoard}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </SolutionsContext.Provider>
  );

};

export default SolutionsContent;



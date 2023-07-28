import { Box, Button, Card, Container, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DifferenceIcon from '@mui/icons-material/Difference';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export default function DetailedZoneCard({ zone, handleClickMore }) {
    // zone is a feature for now
    const paperStyle = {
    //   height: 200,
      padding: 20
    };
    console.log("zone in detailedzonecard componet", zone);
    return (
      (!zone) ?
  
        <Skeleton variant="rectangular" width={210} height={60} /> :
  
        <Paper className='detailed-zone-card' elevation={2} style={paperStyle}>
          <h3>{zone.properties.name}</h3>
          <Typography>Borough: {zone.properties.borough}</Typography>
          <Typography>Total Impression: 100</Typography>
          <Typography>Target Impression: 60</Typography>
          <Typography>Average Income: 3000</Typography>
          <Typography>Average Age: 45</Typography>
          <Typography>Total Business: 20</Typography>

          <Box display="flex" justifyContent="flex-end">
            <IconButton aria-label="Add to compare"><DifferenceIcon /></IconButton>
            <IconButton aria-label="Save"><FavoriteIcon /></IconButton>
            <IconButton aria-label="More" onClick={handleClickMore}><MoreHorizIcon /></IconButton>
          </Box>

        </Paper>
    );
  }
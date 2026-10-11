package com.rapidrescue;
import com.rapidrescue.util.LocationUtil; import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class LocationUtilTest { @Test void validCoordinates(){assertTrue(LocationUtil.valid(17.3,78.4));} @Test void rejectsInvalidCoordinates(){assertFalse(LocationUtil.valid(100.0,78.4));}}

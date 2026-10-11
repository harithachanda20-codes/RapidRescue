package com.rapidrescue;
import com.rapidrescue.util.DistanceCalculator; import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class DistanceCalculatorTest { @Test void samePointIsZero(){assertEquals(0,DistanceCalculator.km(17.0,78.0,17.0,78.0),0.0001);} @Test void hyderabadCoordinatesAreReasonable(){double d=DistanceCalculator.km(17.385,78.4867,17.4216,78.4071);assertTrue(d>8&&d<12);}}

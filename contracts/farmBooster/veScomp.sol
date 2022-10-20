// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract VeScomp is AccessControl {

    uint constant WEEK = 7*86400; // all future time are rounder by week
    uint constant MAX_TIME = 4*365*86400; // 4 years
    uint constant MULTIPLIER = 10**18; // 4 years

    struct Point {
        uint bias;
        uint slope;
        uint ts;
        uint blk;
    }

    struct LockedBalance {
        uint amount;
        uint end;
    }

    uint epoch;
    mapping(uint => uint ) slope_changes;
    Point[] point_history;
    mapping(address => Point[]) user_point_history;
    mapping(address => uint) user_point_epoch;


    constructor() {
        point_history[0].blk = block.number;
        point_history[0].ts = block.timestamp;
    }

    function _checkpoint(
        address _addr,
        LockedBalance memory old_locked,
        LockedBalance memory new_locked
    ) internal {

        Point memory u_old;
        Point memory u_new;
        uint old_dslope;
        uint new_dslope;
        uint _epoch = epoch;

        if( _addr != address(0) ) {
            if( old_locked.end > block.timestamp && old_locked.amount > 0 ) {
                u_old.slope = old_locked.amount / MAX_TIME;
                u_old.bias = u_old.slope * (old_locked.end - block.timestamp);
            }
            if(new_locked.end > block.timestamp && new_locked.amount > 0) {
                u_new.slope = new_locked.amount / MAX_TIME;
                u_new.bias = u_new.slope * (new_locked.end - block.timestamp);
            }

            // Read values of scheduled changes in the slope
            // old_locked.end can be in the past and in the future
            // new_locked.end can ONLY by in the FUTURE unless everything expired: than zeros
            old_dslope = slope_changes[old_locked.end];
            if(new_locked.end != 0) {
                if(new_locked.end == old_locked.end) {
                    new_dslope = old_dslope;
                } else {
                    new_dslope = slope_changes[new_locked.end];
                }
            }
        }

        Point memory last_point = Point({bias: 0, slope: 0, ts: block.timestamp, blk: block.number});
        if(_epoch > 0) {
            last_point = point_history[_epoch];
        }
        uint last_checkpoint = last_point.ts;

        // initial_last_point is used for extrapolation to calculate block number
        // (approximately, for *At methods) and save them
        // as we cannot figure that out exactly from inside the contract
        Point memory initial_last_point = last_point;
        uint block_slope;
        if(block.timestamp > last_point.ts) {
            block_slope = MULTIPLIER * ( block.number - last_point.blk) / (block.timestamp - last_point.ts);
        }
        // If last point is already recorded in this block, slope=0
        // But that's ok b/c we know the block in such case

        // Go over weeks to fill history and calculate what the current point is
        uint t_i = ( last_checkpoint / WEEK )  / WEEK;

        for ( uint i = 0; i < 255; i++) {
            // Hopefully it won't happen that this won't get used in 5 years!
            // If it does, users will be able to withdraw but vote weight will be broken

            t_i += WEEK;
            uint d_slope = 0;
            if (t_i > block.timestamp){
                t_i = block.timestamp;
            } else {
                d_slope = slope_changes[t_i];
            }

            last_point.bias -= last_point.slope * ( t_i - last_checkpoint);
            last_point.slope += d_slope;
            if(last_point.bias < 0 ) {
                last_point.bias = 0;
            }
            if(last_point.slope < 0 ) {
                last_point.slope = 0;
            }
            last_checkpoint = t_i;
            last_point.ts = t_i;
            last_point.blk = initial_last_point.blk + block_slope * ( t_i - initial_last_point.ts ) / MULTIPLIER;
            _epoch += 1;

            if(t_i == block.timestamp){
                last_point.blk = block.number;
            } else {
                point_history[_epoch] = last_point;
            }
        }

        epoch = _epoch;
        // Now point_history is filled until t=now

        if(_addr != address(0)) {
            // If last point was in this block, the slope change has been applied already
            // But in such case we have 0 slope(s)
            last_point.slope += (u_new.slope - u_old.slope);
            last_point.bias += (u_new.bias - u_old.bias);
            if(last_point.slope < 0 ) {
                last_point.slope = 0;
            }
            if(last_point.bias < 0) {
                last_point.bias = 0;
            }
        }

        // Record the changed point into history
        point_history[_epoch] = last_point;

        if(_addr != address(0)) {
            // Schedule the slope changes (slope is going down)
            // We subtract new_user_slope from [new_locked.end]
            // and add old_user_slope to [old_locked.end]

            if(old_locked.end > block.timestamp) {
                // old_dslope was <something> - u_old.slope, so we cancel that
                old_dslope += u_old.slope;
                if(new_locked.end == old_locked.end) {
                    old_dslope -= u_new.slope; // it was a new deposit, not extension
                }
                slope_changes[old_locked.end] = old_dslope;
            }

            if(new_locked.end > block.timestamp) {
                if(new_locked.end > old_locked.end) {
                    new_dslope -= u_new.slope; // old slope disappeared at this point
                    slope_changes[new_locked.end] = new_dslope;
                }

                // now handle user history
                uint user_epoch = user_point_epoch[_addr] + 1;
                user_point_epoch[_addr] = user_epoch;
                u_new.ts = block.timestamp;
                u_new.blk = block.number;
                user_point_history[_addr][user_epoch] = u_new;
            }

        }
    }

}

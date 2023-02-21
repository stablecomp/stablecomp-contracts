// SPDX-License-Identifier: ISC

pragma solidity ^0.8.13;

/*
    Expands swapping functionality over base strategy
    - ETH in and ETH out Variants
    - Sushiswap support in addition to Uniswap
*/
contract TokenSwapPathRegistry {
    mapping(address => mapping(address => address[])) public tokenSwapPaths;
    mapping(address => mapping(address => uint24[])) public feeSwapPaths;
    mapping(address => mapping(address => uint[])) public stepSwapPaths; // only for mixed swap, 0 => v2, 1 => v3
    mapping(address => mapping(address => uint)) public nPoolPath;
    mapping(address => mapping(address => uint)) public typeSwapPath; // 0 => uniswapv2, 1 => uniswapv3 v2, 2 => mixed
    mapping(address => mapping(address => uint)) public typeRouterAddress; // 0 => uniswapV2, 1 => sushiswap, 2 => uniswapV3

    event TokenSwapPathV2Set(address tokenIn, address tokenOut, address[] path);
    event TokenSwapPathV3Set(address tokenIn, address tokenOut, address[] tokenSwapPaths, uint24[] feeSwapPaths, uint nPool);
    event TokenSwapPathMixedSet(address tokenIn, address tokenOut, address[] tokenSwapPaths, uint24[] feeSwapPaths, uint[] stepSwapPaths);

    function getTokenSwapPath(address _tokenIn, address _tokenOut) public view returns (address[] memory) {
        return tokenSwapPaths[_tokenIn][_tokenOut];
    }

    function getFeeSwapPath(address _tokenIn, address _tokenOut) public view returns (uint24[] memory) {
        return feeSwapPaths[_tokenIn][_tokenOut];
    }

    function getNPool(address _tokenIn, address _tokenOut) public view returns (uint) {
        return nPoolPath[_tokenIn][_tokenOut];
    }

    function getTypeSwap(address _tokenIn, address _tokenOut) public view returns (uint) {
        return typeSwapPath[_tokenIn][_tokenOut];
    }

    function getTypeRouterAddress(address _tokenIn, address _tokenOut) public view returns (uint) {
        return typeRouterAddress[_tokenIn][_tokenOut];
    }

    /**
      Set path swap for tokenIn vs tokenOut
    */
    function _setTokenSwapPathV2(
        address _tokenIn,
        address _tokenOut,
        address[] memory _path,
        uint _typeRouter
    ) internal {
        tokenSwapPaths[_tokenIn][_tokenOut] = _path;
        typeSwapPath[_tokenIn][_tokenOut] = 0;
        typeRouterAddress[_tokenIn][_tokenOut] = _typeRouter;
        emit TokenSwapPathV2Set(_tokenIn, _tokenOut, _path);
    }

    /**
      Set path swap for tokenIn vs tokenOut
    */
    function _setTokenSwapPathV3(
        address _tokenIn,
        address _tokenOut,
        address[] memory _coinPath,
        uint24[] memory _feePath,
        uint _nPool
    ) internal {
        tokenSwapPaths[_tokenIn][_tokenOut] = _coinPath;
        feeSwapPaths[_tokenIn][_tokenOut] = _feePath;
        nPoolPath[_tokenIn][_tokenOut] = _nPool;
        typeSwapPath[_tokenIn][_tokenOut] = 1;
        typeRouterAddress[_tokenIn][_tokenOut] = 2;
        emit TokenSwapPathV3Set(_tokenIn, _tokenOut, _coinPath, _feePath, _nPool);
    }

    /**
    Set path swap for tokenIn vs tokenOut
    @dev _stepSwapPath it's only for mixed type swap, indicate the order of swap between v2 and v3
    */
    function _setTokenSwapPathMixed(
        address _tokenIn,
        address _tokenOut,
        address[] memory _coinPath,
        uint24[] memory _feePath,
        uint[] memory _stepSwapPath
    ) internal {
        // todo
        tokenSwapPaths[_tokenIn][_tokenOut] = _coinPath;
        feeSwapPaths[_tokenIn][_tokenOut] = _feePath;
        stepSwapPaths[_tokenIn][_tokenOut] = _stepSwapPath;
        typeSwapPath[_tokenIn][_tokenOut] = 2;
        emit TokenSwapPathMixedSet(_tokenIn, _tokenOut, _coinPath, _feePath, _stepSwapPath);
    }

}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
  function transfer(address recipient, uint256 amount) external returns (bool);

  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) external returns (bool);
}

contract PaybackStaking is ReentrancyGuard, Ownable {
  // Structs
  struct User {
    uint256 balance; // Total staked tokens including rewards
    uint256 depositTime; // Timestamp of the last deposit or withdrawal
    uint256 lastUpdateTime; // Timestamp of the last reward calculation
    bool exists; // Flag to check if the user exists
  }

  // Mappings
  mapping(address => User) private users;

  // Variables
  address[] private userAddresses;
  uint256 public APY; // Annual Percentage Yield in percentage points (e.g., 10 for 10%)
  uint256 public tokenPool; // Total tokens available in the pool for staking
  uint256 public totalStaked; // Total tokens staked by all users
  uint256 public inactivityLimit; // Limit of time until owner takes over the funds
  uint256 private constant TIME_IN_A_YEAR = 365 days; // Time in a year
  IERC20 public stakingToken; // Token address that will be staked

  // Events
  event Deposited(address indexed user, uint256 amount);
  event Withdrawn(address indexed user, uint256 amount);
  event RewardPaid(address indexed user, uint256 reward);
  event APYChanged(uint256 newAPY);
  event TokenPoolRefilled(uint256 amount);
  event OwnerWithdrawn(uint256 amount);
  event InactiveUserUpdated(address indexed user);

  constructor(
    uint256 _initialAPY,
    address _stakingTokenAddress,
    address _initialOwner,
    uint256 _inactivityLimit
  ) Ownable(_initialOwner) {
    APY = _initialAPY;
    stakingToken = IERC20(_stakingTokenAddress);
    inactivityLimit = _inactivityLimit;
  }

  /**
   * @dev Deposits tokens on behalf of a user.
   * @notice Only callable by the contract owner.
   * @param _user Address of the user for whom to deposit tokens.
   * @param _amount Amount of tokens to deposit.
   */
  function depositForUser(address _user, uint256 _amount) external onlyOwner {
    uint256 maxReward = calculateMaxReward(_amount);
    require(
      tokenPool >= _amount + maxReward,
      "Insufficient funds in pool to cover deposit and potential rewards"
    );

    User storage usr = users[_user];
    if (!usr.exists) {
      usr.exists = true;
      userAddresses.push(_user);
    }
    updateReward(_user);
    usr.balance += _amount;
    usr.depositTime = block.timestamp;
    usr.lastUpdateTime = block.timestamp;
    tokenPool -= _amount;
    totalStaked += _amount;
    emit Deposited(_user, _amount);
  }

  /**
   * @dev Allows a user to withdraw their staked tokens along with any accrued rewards.
   * @notice Withdrawal resets the user's balance to zero and can only be done once per staking period.
   */
  function withdraw() external nonReentrant {
    User storage usr = users[msg.sender];
    require(usr.exists, "User does not exist");
    require(usr.balance > 0, "No balance to withdraw");
    require(
      block.timestamp - usr.depositTime < inactivityLimit,
      "Withdrawal period expired"
    );

    updateReward(msg.sender);
    uint256 amount = usr.balance;
    usr.balance = 0;
    usr.depositTime = 0;
    totalStaked -= amount;
    require(stakingToken.transfer(msg.sender, amount), "Token transfer failed");
    emit Withdrawn(msg.sender, amount);
  }

  /**
   * @dev Updates the reward for a given user.
   * @param _user Address of the user for whom to update the reward.
   */
  function updateReward(address _user) internal {
    User storage usr = users[_user];
    if (usr.exists && block.timestamp - usr.depositTime < inactivityLimit) {
      uint256 timeElapsed = block.timestamp - usr.lastUpdateTime;
      uint256 reward = (usr.balance * APY * timeElapsed) /
        (TIME_IN_A_YEAR * 100);
      usr.balance += reward;
      usr.lastUpdateTime = block.timestamp;
      emit RewardPaid(_user, reward);
    }
  }

  /**
   * @dev Sets a new APY for the staking contract.
   * @notice Only callable by the contract owner.
   * @param _newAPY New APY to be set.
   */
  function setAPY(uint256 _newAPY) external onlyOwner {
    APY = _newAPY;
    emit APYChanged(_newAPY);
  }

  /**
   * @dev Refills the token pool with the specified amount.
   * @notice Only callable by the contract owner.
   * @param _amount Amount of tokens to add to the pool.
   */
  function refillTokenPool(uint256 _amount) external onlyOwner {
    require(
      stakingToken.transferFrom(msg.sender, address(this), _amount),
      "Transfer failed"
    );
    tokenPool += _amount;
    emit TokenPoolRefilled(_amount);
  }

  /**
   * @dev Allows the owner to withdraw funds from users who have been inactive for the specified limit.
   * @notice Only callable by the contract owner.
   */
  function ownerWithdrawExpiredFunds() external onlyOwner {
    uint256 expiredFunds = 0;
    for (uint256 i = 0; i < userAddresses.length; i++) {
      address userAddress = userAddresses[i];
      User storage usr = users[userAddress];
      if (usr.exists && block.timestamp - usr.depositTime >= inactivityLimit) {
        expiredFunds += usr.balance;
        usr.balance = 0;
        emit InactiveUserUpdated(userAddress);
      }
    }

    totalStaked -= expiredFunds;
    require(stakingToken.transfer(owner(), expiredFunds), "Withdraw failed");
    emit OwnerWithdrawn(expiredFunds);
  }

  /**
   * @dev Returns the information about the specific address
   * @param _addr address of the user that we want to check
   */
  function getUserInfo(address _addr) public view returns (User memory) {
    return users[_addr];
  }

  /**
   * @dev Calculates the maximum possible reward for a given amount of staked tokens.
   * @param _amount The amount of tokens to be staked.
   * @return The maximum possible reward.
   */
  function calculateMaxReward(uint256 _amount) internal view returns (uint256) {
    return (_amount * APY * inactivityLimit) / (TIME_IN_A_YEAR * 100);
  }
}

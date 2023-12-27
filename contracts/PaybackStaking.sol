// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

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
    uint256 rewards; // Total amount of rewards gained by user
    uint256 depositTime; // Timestamp of the last deposit or withdrawal
    uint256 lastUpdateTime; // Timestamp of the last reward calculation
    bool exists; // Flag to check if the user exists
  }

  // Mappings
  mapping(address => User) private users;

  // Variables
  address[] private userAddresses;
  uint256 public APY; // Annual Percentage Yield in percentage points (e.g., 10 for 10%)
  uint256 public tokenPool; // Total tokens available in the pool for staking and rewards
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
    uint256 totalPotentialStaked = totalStaked + _amount;
    uint256 potentialMaxPayout = calculateMaxPayout(totalPotentialStaked);

    require(
      tokenPool >= potentialMaxPayout,
      "Insufficient tokens in pool to cover potential max rewards"
    );

    User storage usr = users[_user];

    if (!usr.exists) {
      usr.exists = true;
      userAddresses.push(_user);
      usr.lastUpdateTime = block.timestamp;
    } else if (usr.exists) {
      if (block.timestamp - usr.depositTime >= inactivityLimit) {
        uint256 amountExpired = usr.balance + usr.rewards;
        usr.lastUpdateTime = block.timestamp;
        usr.depositTime = block.timestamp;
        usr.balance = 0;
        usr.rewards = 0;
        require(
          stakingToken.transfer(owner(), amountExpired),
          "Token transfer failed"
        );
      } else {
        updateReward(_user);
        usr.lastUpdateTime = block.timestamp;
      }
    }

    usr.balance += _amount;
    usr.depositTime = block.timestamp;

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
    uint256 totalRewards = usr.rewards;

    // Reset user's data
    usr.balance = 0;
    usr.depositTime = 0;
    usr.rewards = 0;
    usr.lastUpdateTime = 0;
    usr.exists = false;

    totalStaked -= amount;
    tokenPool -= totalRewards;
    tokenPool -= amount;
    require(
      stakingToken.transfer(msg.sender, amount + totalRewards),
      "Token transfer failed"
    );
    emit Withdrawn(msg.sender, amount);
  }

  /**
   * @dev Updates the reward for a given user.
   * @param _user Address of the user for whom to update the reward.
   */
  function updateReward(address _user) internal {
    // Ensure that the user exists
    require(users[_user].exists, "User does not exist");

    User storage usr = users[_user];
    uint256 timeElapsed = block.timestamp - usr.lastUpdateTime;

    // Check if the time elapsed is within the inactivity limit
    require(timeElapsed <= inactivityLimit, "Inactivity limit exceeded");

    // Ensure that both balance and APY are non-zero
    require(usr.balance > 0, "Zero user balance");
    require(APY > 0, "Zero APY");

    // Calculate rewards for the whole year
    uint256 rewardForYear = (usr.balance * APY) / 100;

    uint256 reward = (rewardForYear * timeElapsed) / TIME_IN_A_YEAR;

    usr.rewards += reward;
    usr.lastUpdateTime = block.timestamp;
    emit RewardPaid(_user, reward);
  }

  /**
   * @dev Sets a new APY for the staking contract.
   * @notice Only callable by the contract owner.
   * @param _newAPY New APY to be set.
   */
  function setAPY(uint256 _newAPY) external onlyOwner {
    require(_newAPY > 0, "APY has to be greater than zero!");
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
        usr.rewards = 0;
        usr.depositTime = 0;
        usr.lastUpdateTime = 0;
        usr.exists = false;
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
   * @dev Calculates the maximum possible reward for a given amount of staked tokens
   * considering the inactivity limit.
   * @param _totalStaked The total amount of tokens that would be staked.
   * @return The maximum possible reward.
   */
  function calculateMaxPayout(
    uint256 _totalStaked
  ) public view returns (uint256) {
    uint256 maxRewardPeriod = inactivityLimit / TIME_IN_A_YEAR;

    // Perform multiplication first to reduce truncation
    uint256 totalAPY = APY * maxRewardPeriod;
    uint256 maxPayout = (_totalStaked * (100 + totalAPY)) / 100;

    return maxPayout;
  }
}

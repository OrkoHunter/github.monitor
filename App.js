import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  ListView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  TouchableHighlight,
  TextInput,
  Dimensions,
  AsyncStorage,
} from 'react-native'
import moment from 'moment'
import IIcon from 'react-native-vector-icons/Ionicons'
import FIcon from 'react-native-vector-icons/FontAwesome'
import OIcon from 'react-native-vector-icons/Octicons'
import Expo from 'expo'

const has_changed = (r1, r2) => {
  return r1.id !== r2.id
}

const DEVICE_WIDTH = Dimensions.get('window').width

export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      isLoading: true,
      dataSource: new ListView.DataSource({rowHasChanged: has_changed}),
      pageNo: 1,
      rawData: [],
      refreshing: false,
      username: '',
      displayFeed: false,
      loading: true,
      warning: '',
      checkingUsername: false,
      usernameCorrect: false,
      noActivityPresent: false
    }
    Promise.resolve(this.getFromStorage('username'))
      .then(
        (username) => {
          if (username)
            this.setState({
              username: username,
              loading: false,
              displayFeed: true
            }, () => this.fetchData(refresh=true))
          else
            this.setState({loading: false})
        },
        (error) => {
          console.log('Error in resolving promise', error)
        })
  }

  async getFromStorage(key) {
    let username = ''
    try {
      let data = await AsyncStorage.getItem('@OrkoHunter-GHFeed:' + key)
      if (data !== null)
        username = data
    } catch (error) {
      // Do nothing
    }
    return username
  }

  async setToStorage(key, value) {
    try {
      await AsyncStorage.setItem('@OrkoHunter-GHFeed:' + key, value)
    } catch (error) {
      console.log('Error in saving key-value', key, value, 'Error is', error)
    }
  }

  _onRefresh() {
    this.setState({
      refreshing: true,
      isLoading: true,
      noActivityPresent: false,
      dataSource: this.state.dataSource.cloneWithRows([]),
    })
    this.fetchData(refresh=true)
  }


  fetchData(refresh=false) {
    if (refresh) {
      this.setState({pageNo: 1})
      this.forceUpdate()
    }
    if (!this.state.username)
      this.setState({displayFeed: false})
    if (this.state.pageNo <= 10) {
      let url = 'https://api.github.com/users/' + this.state.username + '/events?page=' + this.state.pageNo
      if (refresh)
        url = 'https://api.github.com/users/' + this.state.username + '/events'
      let fetchConfig = {
        method: 'GET',
        headers: {
          Authorization: 'token e9af79f2779524a5be18ebd9c56e5d74fd008dd9'  // Yeah right, I know what you're thinking.
        }
      }
      fetch(url, fetchConfig)
        .then((response) => {
          if (response.ok)
            return response.json()
          else {
            this.setState({pageNo: 1, rawData: []})
            throw new Error('Bad url')
          }
        })
        .then((responseJSON) => {
          if (responseJSON.length < 1)
            this.setState({noActivityPresent: true})
          this.setState({
            isLoading: false,
            rawData: (refresh) ? responseJSON : this.state.rawData.concat(responseJSON),
            dataSource: this.state.dataSource.cloneWithRows((refresh) ? responseJSON : this.state.rawData.concat(responseJSON)),
            pageNo: (refresh) ? 2 : this.state.pageNo + 1,
          })
          if (refresh)
            this.setState({refreshing: false})
        })
        .catch((error) => {
          console.error(error)
        })
    }
  }

  onEndReached() {
    if (this.state.refreshing) return
    if (this.state.noActivityPresent) return
    this.setState({
      isLoading: true
    })
    this.fetchData()
  }

  render() {
    if (!this.state.loading) {
      if (this.state.displayFeed)
        return this.renderFeed()
      else
        return this.inputUsername()
    } else {
      return this.loadingPage()
    }
  }

  loadingPage() {
    return (
      <View style={{top: DEVICE_WIDTH*0.5, left: DEVICE_WIDTH*0.5}}><Text numberOfLines={1}>Loading Page </Text></View>
    )
  }

  renderFeed() {
    return (
      <View style={styles.container}>
        {this.generateHeader()}
        <ListView
          enableEmptySections={ true }
          dataSource={this.state.dataSource}
          renderRow={this.renderRow.bind(this)}
          onEndReached={this.onEndReached.bind(this)}
          renderFooter={this.renderFooter.bind(this)}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh.bind(this)}
            />
          }
        />
      </View>
    )
  }

  inputUsername() {
    return (
      <View style={styles.inputContainer}>
        <Text numberOfLines={1}>Enter GitHub Username</Text>
        <View>
          <TextInput
            style={styles.textInput}
            onChangeText={(username) => this.setState({username, warning: '', usernameCorrect: false})}
            value={this.state.text}
            autoCorrect={false}
            autoFocus={true}
            blurOnSubmit={false}
            onSubmitEditing={() => this.onChangeText()}
            returnKeyType='go'
            underlineColorAndroid='rgba(0,0,0,0)'
          />
          <View style={{
            position: 'absolute',
            zIndex: 100,
            left: DEVICE_WIDTH*0.01,
            top: DEVICE_WIDTH*0.018,
          }}>
            {(this.state.checkingUsername) ? (
              <ActivityIndicator style={{paddingTop: DEVICE_WIDTH*0.01}} size={12} color='black'/>
            ) : (
              <Text numberOfLines={1}>@</Text>
            )}
          </View>
          <View style={{
            position: 'absolute',
            zIndex: 100,
            right: DEVICE_WIDTH*0.01,
            top: DEVICE_WIDTH*0.018,
          }}>
            {this.state.usernameCorrect &&
              <OIcon style={{color: 'green'}} size={20} name="check" />
            }
          </View>
        </View>
        <Text style={{color: 'red'}}>{this.state.warning}</Text>
      </View>
    )
  }

  onChangeText() {
    if (this.state.usernameCorrect) this.submit()
    else {
      if (!this.state.username) return
      this.setState({checkingUsername: true})
      let url = 'https://api.github.com/users/' + this.state.username
      let fetchConfig = {
        method: 'GET',
        headers: {
          Authorization: 'token e9af79f2779524a5be18ebd9c56e5d74fd008dd9'  // Yeah right, I know what you're thinking.
        }
      }
      fetch(url, fetchConfig)
        .then((response) => {
          this.setState({checkingUsername: false})
          if (response.ok) {
            this.setState({usernameCorrect: true})
            return response
          } else
            throw new Error('Invalid Username')
        })
        .then((responseJSON) => {
          Promise.resolve(this.setToStorage('username', this.state.username)).then(() => console.log('Database updated'))
        })
        .catch((e) => this.setState({warning: 'Invalid Username ' + this.state.username, usernameCorrect: false}))
    }
  }

  submit() {
    if (!this.state.usernameCorrect) return
    this.setState({displayFeed: true, usernameCorrect: false}, () => {
      this.fetchData(refresh=true)
    })
  }

  generateHeader() {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.feedHeaderText} numberOfLines={1}>{this.state.username}'s activities </Text>
        <TouchableHighlight underlayColor="#fff" onPress={() => this.changeUsername()}>
          <Text style={styles.feedHeaderBtnText}>Change Username</Text>
        </TouchableHighlight>
      </View>
    )
  }

  changeUsername() {
    this.setState({
      displayFeed: false,
      isLoading: true,
      username: '',
      noActivityPresent: false,
      dataSource: this.state.dataSource.cloneWithRows([])
    })
  }

  renderRow(rowData) {
    switch(rowData.type) {
      case 'IssueCommentEvent':
        return this.renderIssueCommentEvent(rowData)
      case 'ForkEvent':
        return this.renderForkEvent(rowData)
      case 'PushEvent':
        return this.renderPushEvent(rowData)
      case 'PullRequestEvent':
        return this.renderPullRequestEvent(rowData)
      case 'CreateEvent':
        return this.renderCreateEvent(rowData)
      case 'WatchEvent':
        return this.renderWatchEvent(rowData)
      case 'PullRequestReviewCommentEvent':
        return this.renderIssueCommentEvent(rowData)
      case 'IssuesEvent':
        return this.renderIssuesEvent(rowData)
      default:
        console.log('rowData type not handled', rowData)
        return <View />
    }

  }

  renderIssueCommentEvent(rowData) {
    return (
      <TouchableHighlight underlayColor='#D3D3D3' onPress={() => Linking.openURL(rowData.issue.html_url)}>
        <View style={styles.issueCommentRow}>
          <View style={styles.IconView}>
            <FIcon style={styles.IconItem} name='comments' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.payload.comment.updated_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderIssuesEvent(rowData) {
    return (
      <TouchableHighlight underlayColor='#D3D3D3' onPress={() => Linking.openURL(rowData.payload.comment.html_url)}>
        <View style={styles.issueCommentRow}>
          <View style={styles.IconView}>
            <OIcon style={styles.IconItem} name='issue-opened' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.created_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderWatchEvent(rowData) {
    return (
      <TouchableHighlight underlayColor='#D3D3D3' onPress={() => Linking.openURL(rowData.payload.comment.html_url)}>
        <View style={styles.issueCommentRow}>
          <View style={styles.IconView}>
            <IIcon style={styles.IconItem} name='ios-eye' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.created_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderForkEvent(rowData) {
    return (
      <TouchableHighlight>
        <View style={styles.forkEvent}>
          <View style={styles.IconView}>
            <FIcon style={styles.IconItem} name='code-fork' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.payload.forkee.created_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderPushEvent(rowData) {
    return (
      <TouchableHighlight>
        <View style={styles.pushEvent}>
          <View style={styles.IconView}>
            <OIcon style={styles.IconItem} name='repo-push' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.created_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderPullRequestEvent(rowData) {
    return (
      <TouchableHighlight>
        <View style={styles.PullRequestEvent}>
          <View style={styles.IconView}>
            <OIcon style={styles.IconItem} name='git-pull-request' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.created_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderCreateEvent(rowData) {
    return (
      <TouchableHighlight>
        <View style={styles.CreateEvent}>
          <View style={styles.IconView}>
            <IIcon style={styles.IconItem} name='md-create' />
            <Text numberOfLines={1}>{rowData.repo.name}</Text>
          </View>
          <Text numberOfLines={1}>{this.renderTime(rowData.created_at)}</Text>
        </View>
      </TouchableHighlight>
    )
  }

  renderFooter() {
    if (this.state.refreshing)
      return (<View />)
    return (
      <TouchableHighlight>
        <View style={styles.footer}>
          {(this.state.isLoading) ? (
            <ActivityIndicator/>
          ) : (
            <Text numberOfLines={1}>~FIN~</Text>
          )}
        </View>
      </TouchableHighlight>
    )
  }

  renderTime(time) {
    let momentTime = moment(time)
    if (momentTime.format('L') === moment().format('L')) {
      return momentTime.format('HH:mm')
    } else if (momentTime.format('L') === moment().subtract(1, 'days').format('L')) {
      return 'Yesterday'
    } else {
      return momentTime.format('D MMM')
    }
  }

}

const styles = StyleSheet.create({
  container: {
    paddingTop: Expo.Constants.statusBarHeight,  // See this https://github.com/react-community/react-navigation/issues/12
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainer: {
    paddingTop: Expo.Constants.statusBarHeight,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  textInput: {
    width: DEVICE_WIDTH*0.5,
    borderColor: 'gray',
    borderWidth: 1,
    paddingLeft: DEVICE_WIDTH*0.045,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e84333',
    borderWidth: 0.8,
    height: 40,
    padding: 8,
  },
  feedHeaderText: {
    color: 'white',
    fontWeight: '900',
  },
  feedHeaderBtnText: {
    color: 'white',
  },
  issueCommentRow: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forkEvent: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pushEvent: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  PullRequestEvent: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  CreateEvent: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  IconView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  IconItem: {
    marginRight: 4,
  },
})

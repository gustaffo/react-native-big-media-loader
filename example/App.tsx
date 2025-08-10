import React, {useState} from 'react';
import {Button, Text, View, ScrollView, StyleSheet, Alert, Image} from 'react-native';
import {BigMediaLoader} from '../src/index';
import Video from 'react-native-video';
import {Buffer} from 'buffer';

export default function Demo() {
  const [handle, setHandle] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [playUri, setPlayUri] = useState<string | null>(null);
  const [chunkData, setChunkData] = useState<string>('');
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);

  const pickImage = async () => {
    try {
      const result = await BigMediaLoader.pickImage({
        multiple: true,
        maxCount: 5
      });
      
      if (!result.canceled) {
        setSelectedAssets(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await BigMediaLoader.pickVideo({
        multiple: false
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const h = BigMediaLoader.open(asset.uri);
        const s = BigMediaLoader.stat(h);
        const p = BigMediaLoader.playableUri(h);
        setHandle(h);
        setStats(s);
        setPlayUri(p);
        setChunkData('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const pickMedia = async () => {
    try {
      const result = await BigMediaLoader.pickMedia({
        multiple: false,
        mediaType: 'all'
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const h = BigMediaLoader.open(asset.uri);
        const s = BigMediaLoader.stat(h);
        const p = BigMediaLoader.playableUri(h);
        setHandle(h);
        setStats(s);
        setPlayUri(p);
        setChunkData('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const readFirst1MB = () => {
    if (handle == null) return;
    try {
      const {base64, bytesRead} = BigMediaLoader.readBase64(handle, 0, 1024 * 1024);
      const buf = Buffer.from(base64, 'base64');
      const hexPreview = buf.slice(0, 32).toString('hex');
      setChunkData(`Read ${bytesRead} bytes\nFirst 32 bytes (hex): ${hexPreview}`);
      console.log('read', bytesRead, 'bytes, first 16:', buf.slice(0, 16));
    } catch (error) {
      Alert.alert('Error', 'Failed to read file chunk');
    }
  };

  const readLast1MB = () => {
    if (handle == null || stats == null) return;
    try {
      const offset = Math.max(0, stats.size - 1024 * 1024);
      const {base64, bytesRead} = BigMediaLoader.readBase64(handle, offset, 1024 * 1024);
      const buf = Buffer.from(base64, 'base64');
      const hexPreview = buf.slice(0, 32).toString('hex');
      setChunkData(`Read ${bytesRead} bytes from offset ${offset}\nFirst 32 bytes (hex): ${hexPreview}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to read file chunk');
    }
  };

  const cleanup = () => {
    if (handle != null) {
      try {
        BigMediaLoader.close(handle);
      } catch (error) {
        console.error('Error closing handle:', error);
      }
    }
    setHandle(null);
    setStats(null);
    setPlayUri(null);
    setChunkData('');
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Big Media Loader Demo</Text>
        
        <View style={styles.buttonContainer}>
          <Button title="Pick Images" onPress={pickImage} />
          <Button title="Pick Video" onPress={pickVideo} />
          <Button title="Pick Media" onPress={pickMedia} />
        </View>
        
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>File Information:</Text>
            <Text style={styles.statsText}>Name: {stats.name}</Text>
            <Text style={styles.statsText}>Size: {formatFileSize(stats.size)}</Text>
            <Text style={styles.statsText}>MIME: {stats.mime || 'Unknown'}</Text>
            <Text style={styles.statsText}>URI: {stats.uri}</Text>
            
            <View style={styles.buttonContainer}>
              <Button title="Read first 1MB" onPress={readFirst1MB} />
              <Button title="Read last 1MB" onPress={readLast1MB} />
              <Button title="Close file" onPress={cleanup} color="#ff4444" />
            </View>
          </View>
        )}
        
        {chunkData ? (
          <View style={styles.chunkContainer}>
            <Text style={styles.chunkTitle}>Chunk Data:</Text>
            <Text style={styles.chunkText}>{chunkData}</Text>
          </View>
        ) : null}
        
        {selectedAssets.length > 0 && (
          <View style={styles.imagesContainer}>
            <Text style={styles.imagesTitle}>Selected Images:</Text>
            <ScrollView horizontal style={styles.imagesScroll}>
              {selectedAssets.map((asset, index) => (
                <Image
                  key={index}
                  source={{uri: asset.uri}}
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}
        
        {playUri && (
          <View style={styles.videoContainer}>
            <Text style={styles.videoTitle}>Media Player:</Text>
            <Video
              source={{uri: playUri}}
              style={styles.video}
              controls
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 15,
    gap: 10,
  },
  chunkContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chunkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chunkText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 4,
  },
  videoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 200,
    backgroundColor: 'black',
    borderRadius: 8,
  },
  imagesContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
});
